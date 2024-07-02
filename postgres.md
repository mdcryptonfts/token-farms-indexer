# Postgres configuration


## Database initialization

```
CREATE DATABASE wax;
GRANT CONNECT, TEMPORARY ON DATABASE wax TO waxdao;
GRANT ALL PRIVILEGES ON DATABASE wax TO waxdao;
\c wax
```

## Table creation for health

```
CREATE TABLE tokenfarms_health (
    id SMALLINT PRIMARY KEY NOT NULL,
    last_updated_block BIGINT NOT NULL,
    head_block BIGINT NOT NULL
);

GRANT ALL PRIVILEGES ON TABLE tokenfarms_health TO waxdao;
```

## Table creation for token farms

```
CREATE TABLE tokenfarms_farms (
    farm_name VARCHAR(12) PRIMARY KEY NOT NULL,
    creator VARCHAR(12) NOT NULL,
    original_creator VARCHAR(12) NOT NULL,
    time_created BIGINT NOT NULL,
    staking_token JSON,
    incentive_count SMALLINT NOT NULL,
    total_staked BIGINT NOT NULL,
    vesting_time BIGINT NOT NULL,
    last_update_time BIGINT NOT NULL,
    global_sequence BIGINT NOT NULL,
    reward_pools JSON
);

GRANT ALL PRIVILEGES ON TABLE tokenfarms_farms TO waxdao;
CREATE INDEX creator_idx ON tokenfarms_farms (creator);
CREATE INDEX original_creator_idx ON tokenfarms_farms (original_creator);
CREATE INDEX time_created_idx ON tokenfarms_farms (time_created);
```

## Table creation for stakers

```
CREATE TABLE tokenfarms_stakers (
    id SERIAL PRIMARY KEY NOT NULL,
    username VARCHAR(12) NOT NULL,
    farm_name VARCHAR(12) NOT NULL,
    balance JSON,
    balance_numeric BIGINT,
    last_update_time BIGINT NOT NULL,
    global_sequence BIGINT NOT NULL,
    CONSTRAINT user_farm_unique UNIQUE (username, farm_name)
);

GRANT ALL PRIVILEGES ON TABLE tokenfarms_stakers TO waxdao;
GRANT USAGE, SELECT ON SEQUENCE tokenfarms_stakers_id_seq TO waxdao;
CREATE INDEX user_idx ON tokenfarms_stakers (username);
CREATE INDEX farm_idx ON tokenfarms_stakers (farm_name);
CREATE INDEX balance_idx ON tokenfarms_stakers (balance_numeric);
CREATE INDEX user_farm_idx ON tokenfarms_stakers (username, farm_name);
```

## Trigger function to store the numeric balance for stakers during updates/inserts

```
CREATE OR REPLACE FUNCTION update_balance_numeric()
RETURNS TRIGGER AS $$
BEGIN
    NEW.balance_numeric := CAST(
        regexp_replace(NEW.balance->>'quantity', '[^0-9]', '', 'g')
        AS BIGINT
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```
CREATE TRIGGER update_balance_numeric_trigger
BEFORE INSERT OR UPDATE ON tokenfarms_stakers
FOR EACH ROW EXECUTE FUNCTION update_balance_numeric();
```


## Table creation for farm deltas

```
CREATE TYPE delta_type_enum AS ENUM ('INSERT', 'UPDATE', 'DELETE');

CREATE TABLE tokenfarms_farm_deltas (
    delta_id BIGSERIAL PRIMARY KEY,
    farm_name VARCHAR(12) NOT NULL,
    delta_type delta_type_enum NOT NULL,
    old_data JSON,
    block_number BIGINT NOT NULL
);

GRANT ALL PRIVILEGES ON TABLE tokenfarms_farm_deltas TO waxdao;
GRANT USAGE, SELECT ON SEQUENCE tokenfarms_farm_deltas_delta_id_seq TO waxdao;
CREATE INDEX block_idx ON tokenfarms_farm_deltas (block_number);
```

## Table creation for staker deltas

```
CREATE TABLE tokenfarms_staker_deltas (
    delta_id BIGSERIAL PRIMARY KEY,
    user_farm VARCHAR(25) NOT NULL,
    delta_type delta_type_enum NOT NULL,
    old_data JSON,
    block_number BIGINT NOT NULL
);

GRANT ALL PRIVILEGES ON TABLE tokenfarms_staker_deltas TO waxdao;
GRANT USAGE, SELECT ON SEQUENCE tokenfarms_staker_deltas_delta_id_seq TO waxdao;
CREATE INDEX staker_block_idx ON tokenfarms_staker_deltas (block_number);
```

## Create function to set session variable for rollback in progress

```
CREATE OR REPLACE FUNCTION set_rollback_in_progress()
RETURNS void AS $$
BEGIN
    PERFORM set_config('tokenfarms.rollback_is_in_progress', 'true', false);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION unset_rollback_in_progress()
RETURNS void AS $$
BEGIN
    PERFORM set_config('tokenfarms.rollback_is_in_progress', 'false', false);
END;
$$ LANGUAGE plpgsql;
```

## Create function to check new global sequence is > old, unless rollback is in progress

```
CREATE OR REPLACE FUNCTION check_global_sequence()
RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('tokenfarms.rollback_is_in_progress', true) IS NOT NULL 
        AND current_setting('tokenfarms.rollback_is_in_progress', true) = 'true' THEN
        RETURN NEW;
    END IF;

    IF NEW.global_sequence < OLD.global_sequence THEN
        RAISE EXCEPTION 'New global sequence (%) is less than existing global sequence (%)', NEW.global_sequence, OLD.global_sequence;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Create trigger on farms table and stakers table to call check_global_sequence on updates

```
CREATE TRIGGER trigger_check_farms_global_sequence
BEFORE UPDATE ON tokenfarms_farms
FOR EACH ROW
EXECUTE FUNCTION check_global_sequence();
```

```
CREATE TRIGGER trigger_check_stakers_global_sequence
BEFORE UPDATE ON tokenfarms_stakers
FOR EACH ROW
EXECUTE FUNCTION check_global_sequence();
```
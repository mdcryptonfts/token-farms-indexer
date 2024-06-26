# Postgres configuration


## Database initialization

> CREATE DATABASE wax;

> GRANT CONNECT, TEMPORARY ON DATABASE wax TO waxdao;

> GRANT ALL PRIVILEGES ON DATABASE wax TO waxdao;


## Table creation for token farms

> \c wax

> CREATE TABLE tokenfarms_farms (
    farm_name VARCHAR(12) PRIMARY KEY NOT NULL,
    creator VARCHAR(12) NOT NULL,
    original_creator VARCHAR(12) NOT NULL,
    time_created BIGINT NOT NULL,
    staking_token JSON,
    incentive_count SMALLINT NOT NULL,
    total_staked BIGINT NOT NULL,
    vesting_time BIGINT NOT NULL,
    last_update_time BIGINT NOT NULL,
    reward_pools JSON
);

> GRANT ALL PRIVILEGES ON TABLE tokenfarms_farms TO waxdao;
> CREATE INDEX creator_idx ON tokenfarms_farms (creator);
> CREATE INDEX original_creator_idx ON tokenfarms_farms (original_creator);
> CREATE INDEX time_created_idx ON tokenfarms_farms (time_created);


## Table creation for stakers

> CREATE TABLE tokenfarms_stakers (
    id SERIAL PRIMARY KEY NOT NULL,
    username VARCHAR(12) NOT NULL,
    farm_name VARCHAR(12) NOT NULL,
    balance JSON,
    last_update_time BIGINT NOT NULL,
    CONSTRAINT user_farm_unique UNIQUE (username, farm_name)
);

> GRANT ALL PRIVILEGES ON TABLE tokenfarms_stakers TO waxdao;
> GRANT USAGE, SELECT ON SEQUENCE tokenfarms_stakers_id_seq TO waxdao;
> CREATE INDEX user_idx ON tokenfarms_stakers (username);
> CREATE INDEX farm_idx ON tokenfarms_stakers (farm_name);
> CREATE INDEX user_farm_idx ON tokenfarms_stakers (username, farm_name);


## Table creation for farm deltas

CREATE TYPE delta_type_enum AS ENUM ('INSERT', 'UPDATE', 'DELETE');

CREATE TABLE tokenfarms_farm_deltas (
    delta_id BIGSERIAL PRIMARY KEY,
    farm_name VARCHAR(12) NOT NULL,
    delta_type delta_type_enum NOT NULL,
    old_data JSON,
    block_number BIGINT NOT NULL
);
> GRANT ALL PRIVILEGES ON TABLE tokenfarms_farm_deltas TO waxdao;
> GRANT USAGE, SELECT ON SEQUENCE tokenfarms_farm_deltas_delta_id_seq TO waxdao;
> CREATE INDEX block_idx ON tokenfarms_farm_deltas (block_number);

## Table creation for staker deltas

CREATE TABLE tokenfarms_staker_deltas (
    delta_id BIGSERIAL PRIMARY KEY,
    user_farm VARCHAR(25) NOT NULL,
    delta_type delta_type_enum NOT NULL,
    old_data JSON,
    block_number BIGINT NOT NULL
);
> GRANT ALL PRIVILEGES ON TABLE tokenfarms_staker_deltas TO waxdao;
> GRANT USAGE, SELECT ON SEQUENCE tokenfarms_staker_deltas_delta_id_seq TO waxdao;
> CREATE INDEX staker_block_idx ON tokenfarms_staker_deltas (block_number);


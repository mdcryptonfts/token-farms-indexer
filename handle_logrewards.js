const config = require('./config.json');

const handle_logrewards = async (message, postgresPool) => {

    for (let attempt = 1; attempt <= config.max_retries; attempt++) {
        let postgresClient = null;

        try {
            const block_num = JSON.parse(message).blocknum;
            const block_timestamp = JSON.parse(message).blocktimestamp;
            const global_sequence = JSON.parse(message)?.receipt?.global_sequence;
            const first_receiver = JSON.parse(message)?.receiver;
            if (first_receiver != config.farm_contract) return;

            postgresClient = await postgresPool.connect();
            await postgresClient.query('BEGIN');

            const data = JSON.parse(message)?.data;
            const f = data.f;
            const rewards = data.rs;

            const selectQuery = `
                SELECT *
                FROM tokenfarms_farms
                WHERE farm_name = $1
            `;
            const selectResult = await postgresClient.query(selectQuery, [f.farm_name]);

            if (selectResult.rows.length !== 0) {
                const old_data = selectResult.rows[0];

                const updateQuery = `
                    UPDATE tokenfarms_farms 
                    SET reward_pools = $1, last_update_time = $2, incentive_count = $3, global_sequence = $4, total_staked = $5
                    WHERE farm_name = $6
                `;
                const updateValues = [{ rewards: rewards }, f.last_update_time, f.incentive_count, global_sequence, f.total_staked, f.farm_name];
                await postgresClient.query(updateQuery, updateValues);

                console.log(`Updated farm ${f.farm_name}`);

                const insertDeltaQuery = `
                    INSERT INTO tokenfarms_farm_deltas (farm_name, delta_type, old_data, block_number)
                    VALUES ($1, $2, $3, $4)
                `;
                const deltaValues = [
                    old_data.farm_name,
                    'UPDATE',
                    old_data,
                    block_num
                ];
                await postgresClient.query(insertDeltaQuery, deltaValues);

                console.log(`Inserted delta for updating ${f.farm_name} farm`);
            } else {
                console.log(`No existing row on logrewards for ${f.farm_name} (this should never happen)`);
                await postgresClient.query('ROLLBACK');
                continue;
            }

            await postgresClient.query('COMMIT');
            break;
        } catch (error) {
            if (postgresClient) {
                await postgresClient.query('ROLLBACK');
            }

            console.log(`Attempt ${attempt} - Error: ${error}`);

            if (attempt < config.max_retries) {
                console.log(`Retrying in ${config.retry_delay_ms / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, config.retry_delay_ms));
            } else {
                console.log(`Failed after ${config.max_retries} attempts`);
            }
        } finally {
            if (postgresClient) {
                postgresClient.release();
            }
        }
    }
}

module.exports = {
    handle_logrewards
}

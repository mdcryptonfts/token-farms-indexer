const config = require('./config.json');

const handle_rollback = async (message, postgresPool, block_num) => {
    let postgresClient = null;

    try {
        postgresClient = await postgresPool.connect();

        await postgresClient.query('BEGIN');

        await postgresClient.query("SELECT set_config('tokenfarms.rollback_is_in_progress', 'true', false)");

        try {
            const selectQuery = `
                WITH ranked_deltas AS (
                    SELECT
                        *,
                        ROW_NUMBER() OVER (PARTITION BY farm_name ORDER BY block_number ASC) AS rn
                    FROM tokenfarms_farm_deltas
                    WHERE block_number >= $1
                )
                SELECT *
                FROM ranked_deltas
                WHERE rn = 1;
            `;

            const selectValues = [block_num];
            const selectResult = await postgresClient.query(selectQuery, selectValues);

            if (selectResult.rows.length > 0) {
                console.log("selected farm deltas:");
                console.log(selectResult.rows);

                for (const farm of selectResult.rows) {
                    if (farm.delta_type == "DELETE") {
                        try {
                            const old = farm.old_data;

                            const insertQuery = `
                                INSERT INTO tokenfarms_farms(farm_name, creator, original_creator, time_created, staking_token, incentive_count, total_staked, vesting_time, last_update_time, reward_pools, global_sequence)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                            `;
                            const insertValues = [
                                old.farm_name, old.creator, old.original_creator,
                                old.time_created, old.staking_token, old.incentive_count,
                                old.total_staked, old.vesting_time, old.last_update_time,
                                old.reward_pools, old.global_sequence
                            ];

                            const insertResult = await postgresClient.query(insertQuery, insertValues);

                        } catch (e) {
                            console.log(`error inserting into tokenfarms_farms during rollback: ${e}`);
                        }
                    } else if (farm.delta_type == "INSERT") {
                        try {
                            const deleteQuery = `
                                DELETE FROM tokenfarms_farms
                                WHERE farm_name = $1
                            `;
                            const deleteValues = [farm.farm_name];

                            const deleteResult = await postgresClient.query(deleteQuery, deleteValues);

                        } catch (e) {
                            console.log(`error deleting from tokenfarms_farms during rollback: ${e}`);
                        }
                    } else if (farm.delta_type == "UPDATE") {
                        try {
                            const old = farm.old_data;

                            const updateQuery = `
                                UPDATE tokenfarms_farms 
                                SET reward_pools = $1, last_update_time = $2, incentive_count = $3, total_staked = $4, vesting_time = $5, global_sequence = $6
                                WHERE farm_name = $7
                            `;
                            const updateValues = [old.reward_pools, old.last_update_time, old.incentive_count,
                                old.total_staked, old.vesting_time, old.global_sequence, old.farm_name
                            ];

                            await postgresClient.query(updateQuery, updateValues);

                        } catch (e) {
                            console.log(`error updating tokenfarms_farms during rollback: ${e}`);
                        }
                    }
                }

            } else {
                console.log("there were no farm deltas to reverse");
            }

        } catch (e) {
            console.log(`error selecting farm deltas during rollback: ${e}`);
        }

        try {
            const selectQuery = `
                WITH ranked_deltas AS (
                    SELECT
                        *,
                        ROW_NUMBER() OVER (PARTITION BY user_farm ORDER BY block_number ASC) AS rn
                    FROM tokenfarms_staker_deltas
                    WHERE block_number >= $1
                )
                SELECT *
                FROM ranked_deltas
                WHERE rn = 1;
            `;

            const selectValues = [block_num];
            const selectResult = await postgresClient.query(selectQuery, selectValues);

            if (selectResult.rows.length > 0) {
                console.log("selected staker deltas:");
                console.log(selectResult.rows);

                for (const staker of selectResult.rows) {
                    if (staker.delta_type == "DELETE") {
                        try {
                            const old = staker.old_data;

                            const insertQuery = `
                                INSERT INTO tokenfarms_stakers (username, farm_name, balance, last_update_time, global_sequence)
                                VALUES ($1, $2, $3, $4, $5)
                            `;
                            const insertValues = [
                                old.username, old.farm_name, old.balance,
                                old.last_update_time, old.global_sequence
                            ];

                            const insertResult = await postgresClient.query(insertQuery, insertValues);

                        } catch (e) {
                            console.log(`error inserting into tokenfarms_stakers during rollback: ${e}`);
                        }
                    } else if (staker.delta_type == "INSERT") {
                        try {
                            const deleteQuery = `
                                DELETE FROM tokenfarms_stakers
                                WHERE farm_name = $1
                                AND username = $2
                            `;
                            const deleteValues = [staker.user_farm.split("_")[0], staker.user_farm.split("_")[1]];

                            const deleteResult = await postgresClient.query(deleteQuery, deleteValues);

                        } catch (e) {
                            console.log(`error deleting from tokenfarms_stakers during rollback: ${e}`);
                        }
                    } else if (staker.delta_type == "UPDATE") {
                        try {
                            const old = staker.old_data;

                            const updateQuery = `
                                UPDATE tokenfarms_stakers 
                                SET balance = $1, last_update_time = $2, global_sequence = $3
                                WHERE farm_name = $4
                                AND username = $5
                            `;
                            const updateValues = [old.balance, old.last_update_time, old.global_sequence,
                                old.farm_name, old.username
                            ];

                            await postgresClient.query(updateQuery, updateValues);

                        } catch (e) {
                            console.log(`error updating tokenfarms_stakers during rollback: ${e}`);
                        }
                    }

                }

            } else {
                console.log("there were no staker deltas to reverse");
            }

        } catch (e) {
            console.log(`error selecting staker deltas during rollback: ${e}`);
        }

        try {
            const deleteQuery = `
                DELETE FROM tokenfarms_farm_deltas
                WHERE block_number >= $1
            `;
            const deleteValues = [block_num];

            const deleteResult = await postgresClient.query(deleteQuery, deleteValues);

        } catch (e) {
            console.log(`error deleting farm deltas after rollback: ${e}`);
        }

        try {
            const deleteQuery = `
                DELETE FROM tokenfarms_staker_deltas
                WHERE block_number >= $1
            `;
            const deleteValues = [block_num];

            const deleteResult = await postgresClient.query(deleteQuery, deleteValues);

        } catch (e) {
            console.log(`error deleting staker deltas after rollback: ${e}`);
        }

        await postgresClient.query("SELECT set_config('tokenfarms.rollback_is_in_progress', 'false', false)");

        await postgresClient.query('COMMIT');

    } catch (e) {
        console.log(`error handling rollback: ${e}`);
        if (postgresClient) {
            await postgresClient.query('ROLLBACK');
        }
    } finally {
        if (postgresClient) {
            postgresClient.release();
        }
    }
}

module.exports = {
    handle_rollback
}

const config = require('./config.json');

const handle_logstake = async (message, postgresPool, action_name) => {
    let postgresClient = null;

    try {

        const block_num = JSON.parse(message).blocknum;
        const block_timestamp = JSON.parse(message).blocktimestamp;
        const date = new Date(block_timestamp);
        const epoch_timestamp = Math.floor(date.getTime() / 1000);   
        const global_sequence = JSON.parse(message)?.receipt?.global_sequence;       
        const first_receiver = JSON.parse(message)?.receiver;
        if (first_receiver != config.farm_contract) return;

        postgresClient = await postgresPool.connect();

        const data = JSON.parse(message)?.data;
        const user = data.user
        const farm_name = data.farm_name;
        const amount = data.amount;
        const updated_balance = data.updated_balance;
        const user_farm = `${user}_${farm_name}`;

        try {

            const selectQuery = `
		      SELECT *
		      FROM tokenfarms_stakers
		      WHERE farm_name = $1
              AND username = $2
		    `;
            const selectResult = await postgresClient.query(selectQuery, [farm_name, user]);

            if (selectResult.rows.length !== 0) {
                const old_data = selectResult.rows[0];

                const updateQuery = `
		        UPDATE tokenfarms_stakers 
		        SET balance = $1, last_update_time = $2, global_sequence = $3
		        WHERE farm_name = $4
                AND username = $5
		      `;
                const updateValues = [updated_balance, epoch_timestamp, global_sequence, farm_name, user];
                const updateResult = await postgresClient.query(updateQuery, updateValues);

                console.log(`updated user ${user} for ${action_name} action`);

                const insertDeltaQuery = `
				  INSERT INTO tokenfarms_staker_deltas (user_farm, delta_type, old_data, block_number)
				  VALUES ($1, $2, $3, $4)
				`;
                const deltaValues = [
                    user_farm,
                    'UPDATE',
                    old_data,
                    block_num
                ];
                await postgresClient.query(insertDeltaQuery, deltaValues);

                console.log(`Inserted delta for updating user_farm ${user_farm}`);

            } else {

                if(action_name == "logunstake"){
                    throw new Error(`unstake action for ${user_farm} but no existing row`);
                }

                const insertStakerQuery = `
                  INSERT INTO tokenfarms_stakers (username, farm_name, balance, last_update_time, global_sequence)
                  VALUES ($1, $2, $3, $4, $5)
                `;

                const stakerValues = [
                    user,
                    farm_name,
                    updated_balance,
                    epoch_timestamp,
                    global_sequence
                ];   

                await postgresClient.query(insertStakerQuery, stakerValues);  
                console.log(`inserted user ${user}`);           

                const insertDeltaQuery = `
                  INSERT INTO tokenfarms_staker_deltas (user_farm, delta_type, block_number)
                  VALUES ($1, $2, $3)
                `;
                const deltaValues = [
                    user_farm,
                    'INSERT',
                    block_num
                ];
                await postgresClient.query(insertDeltaQuery, deltaValues);
                console.log(`Inserted delta for inserting user_farm ${user_farm}`);

            }
        } catch (error) {
            console.log(`Error with logstake for user ${user}: ${error}`);
        }

    } catch (e) {
        console.log(`error handling logstake: ${e}`);
    } finally {
        if (postgresClient) {
            postgresClient.release();
        }
    }
}

module.exports = {
    handle_logstake
}
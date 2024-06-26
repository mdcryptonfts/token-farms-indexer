const config = require('./config.json');

const handle_logrewards = async (message, postgresPool) => {
    let postgresClient = null;

    try {

        const block_num = JSON.parse(message).blocknum;
        const block_timestamp = JSON.parse(message).blocktimestamp;
        const first_receiver = JSON.parse(message)?.receiver;
        if (first_receiver != config.farm_contract) return;

        postgresClient = await postgresPool.connect();

        const data = JSON.parse(message)?.data;
        const farm_struct = data.f
        const rewards = data.rs;

        try {

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
		        SET reward_pools = $1
		        WHERE farm_name = $2
		      `;
                const updateValues = [rewards, f.farm_name];
                const updateResult = await postgresClient.query(updateQuery, updateValues);

                console.log(`updated farm ${f.farm_name}`);

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

                console.log(`Inserted delta for updating ${farm_name} farm`);

            } else {
            	console.log(`No existing row on logrewards for ${farm_name} (this should never happen)`);
            }
        } catch (error) {
            console.log(`Error: ${error}`);
        }



    } catch (e) {
        console.log(`error handling logrewards: ${e}`);
    } finally {
        if (postgresClient) {
            postgresClient.release();
        }
    }
}

module.exports = {
    handle_logrewards
}
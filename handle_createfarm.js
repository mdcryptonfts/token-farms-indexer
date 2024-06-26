const config = require('./config.json');

const handle_createfarm = async (message, postgresPool) => {
	let postgresClient = null;

	try{

		const block_num = JSON.parse(message).blocknum;
		const block_timestamp = JSON.parse(message).blocktimestamp;
		const first_receiver = JSON.parse(message)?.receiver;
		if(first_receiver != config.farm_contract) return;	
		
		postgresClient = await postgresPool.connect();

		const data = JSON.parse(message)?.data;
		const creator = data.creator
		const farm_name = data.farm_name;
		const staking_token = data.staking_token;
		const vesting_time = data.vesting_time;
		const original_creator = data.original_creator;
		
		try {
			const insertQuery = `
			  INSERT INTO tokenfarms_farms(farm_name, creator, original_creator, time_created, staking_token, incentive_count, total_staked, vesting_time, last_update_time)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			`;
			const insertValues = [farm_name, creator, original_creator, block_timestamp, staking_token, 0, 0, vesting_time, block_timestamp];
			
			console.log("insertValues:");
			console.log(insertValues);
			//const insertResult = await postgresClient.query(insertQuery, insertValues);
		} catch (e) {
			console.log(`error inserting into _farms: ${e}`);
		}

		try{

			const insertQuery = `
				INSERT INTO tokenfarms_farm_deltas(farm_name, delta_type, block_number)
				VALUES ($1, $2, $3)
			`;

			const insertValues = [farm_name, 'INSERT', block_num];

			console.log("insertValues:");
			console.log(insertValues);

			//const insertResult = await postgresClient.query(insertQuery, insertValues);			

		} catch (e) {
			console.log(`error inserting delta for createfarm: ${e}`);
		}
	
	} catch (e) {
		console.log(`error handling createfarm: ${e}`);
	} finally {
        if (postgresClient) {
            postgresClient.release();
        }
    }
}

module.exports = {
	handle_createfarm
}
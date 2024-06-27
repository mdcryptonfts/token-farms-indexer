const config = require('./config.json');

const handle_rollback = async (message, postgresPool, block_num) => {
	let postgresClient = null;

	try {

		postgresClient = await postgresPool.connect();

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

			if(selectResult.rows.length > 0){
				console.log("selected farm deltas:");
				console.log(selectResult.rows);
				// for each item, process the reverse of that delta_type
				// "reverse_mode" needs to be true, to bypass the constraint on the postgres tables
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

			if(selectResult.rows.length > 0){
				console.log("selected staker deltas:");
				console.log(selectResult.rows);
				// for each item, process the reverse of that delta_type
				// "reverse_mode" needs to be true, to bypass the constraint on the postgres tables
			} else {
				console.log("there were no staker deltas to reverse");
			}	

		} catch (e) {
			console.log(`error selecting staker deltas during rollback: ${e}`);
		}		

	} catch (e) {
		console.log(`error handling rollback: ${e}`);
	} finally {
        if (postgresClient) {
            postgresClient.release();
        }
    }
}

module.exports = {
	handle_rollback
}
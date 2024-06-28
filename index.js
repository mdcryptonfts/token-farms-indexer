const { Pool } = require('pg');
const config = require('./config.json');
const redis = require('redis');
const { isRollbackInProgress } = require('./helpers.js');
const { handle_createfarm } = require('./handle_createfarm.js');
const { handle_logrewards } = require('./handle_logrewards.js');
const { handle_logstake } = require('./handle_logstake.js');
const { handle_rollback } = require('./handle_rollback.js');

const postgresPool = new Pool({
    user: config.postgres.user,
    host: config.postgres.host,  
    database: config.postgres.database, 
    password: config.postgres.password, 
    port: config.postgres.port,      
    max: config.postgres.max,      
});

const runApp = async () => {
    const client = redis.createClient({ socket: {
		host: config.redis.host,
		port: config.redis.port
	}});
    await client.connect();

	const subscriber = client.duplicate();
	await subscriber.connect();

	console.log("All connections established")

	// for testing only
	await subscriber.subscribe(`ship::wax::heartbeat`, async (message) => {
		console.log(`heartbeat: ${message}`)
	})		

	/**
	 * @rollback_channel
	 * 
	 * If there is a fork on the chain, this channel will notify us
	 * 
	 * @handle_rollback
	 * 
	 * Reverses any deltas that happened on/after the block we are rolling back to
	 * 
	 * Postgres session will be set to rollback mode, blocking any new actions from 
	 * being committed to the database. After processing the relevant deltas, any
	 * deltas on/after the rollback block will be deleted from the deltas tables.
	 * 
	 */

	await subscriber.subscribe(`ship::wax::rollback`, async (message) => {
		console.log(`rollback: ${message}`)
		const block_num = Math.min(JSON.parse(message).new_block, JSON.parse(message).old_block); 
		await handle_rollback(message, postgresPool, block_num);
	})		

    await subscriber.subscribe(`ship::wax::actions/contract/${config.farm_contract}`, async (message) => {
        const action_name = JSON.parse(message).name;
        const data = JSON.parse(message).data;

        try {

            for (let attempt = 1; attempt <= config.max_retries; attempt++) {
                const rollbackInProgress = await isRollbackInProgress(postgresPool);

                if (!rollbackInProgress) {
                    switch(action_name) {
                        case "createfarm":
                            await handle_createfarm(message, postgresPool);
                            break;
                        case "logrewards":
                            await handle_logrewards(message, postgresPool);
                            break;
                        case "logstake":
                            await handle_logstake(message, postgresPool, action_name);
                            break;
                        case "logunstake":
                            await handle_logstake(message, postgresPool, action_name);
                            break;
                        default:
                            console.log("default")
                            console.log(action_name)
                            console.log(data)
                    }
                    break;
                } else {
                    console.log(`Rollback in progress. Retrying in ${config.retry_delay_ms / 1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, config.retry_delay_ms));
                }

                if (attempt === config.max_retries) {
                    console.log(`Failed to process ${action_name} after ${config.max_retries} attempts`);
                }
            }
        } catch (e) {
            console.log(`error processing ${config.farm_name} action: ${e}`);
        }
    })	
			      
    process.on('SIGINT', () => {
        client.quit();
        subscriber.quit();
        process.exit();
    });	
	
};

runApp();
const { Pool } = require('pg');
const config = require('./config.json');
const redis = require('redis');
const { isPaused } = require('./helpers.js');
const { handle_createfarm } = require('./handle_createfarm.js');
const { handle_logrewards } = require('./handle_logrewards.js');
const { handle_logstake } = require('./handle_logstake.js');

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
		//console.log(`heartbeat: ${message}`)
	})		

	/**
	 * @rollback
	 * 
	 * If there is a fork on the chain, this will notify us
	 * 
	 * When a rollback happens, we will store `paused` in redis cache, and 
	 * start caching any new messages that come in. Any postgres deltas where
	 * block_number is >= the fork block will be reversed. Once reversed,
	 * unpause and process cache. Then continue as normal.
	 */

	await subscriber.subscribe(`ship::wax::rollback`, async (message) => {
		// set isPaused in redis
		// handle_rollback
		// process pending transactions
		// unpause
		// make sure atomicity is maintained here, and with actions (NX/EX)
		console.log(`rollback: ${message}`)
	})		

	await subscriber.subscribe(`ship::wax::actions/contract/${config.farm_contract}`, async (message) => {
		const action_name = JSON.parse(message).name;
		const data = JSON.parse(message).data;

		try{
			const paused = await isPaused(client);

			if(!paused){
				switch(action_name){
				case "createfarm":
					console.log(action_name);
					await handle_createfarm(message, postgresPool);
				case "logrewards":
					await handle_logrewards(message, postgresPool);
				case "logstake":
					await handle_logstake(message, postgresPool);
				default:
					console.log("default")
					console.log(action_name)
					console.log(data)
				}
				
			} else {
				//await cache_createfarm(message, client);
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
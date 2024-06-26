const { Pool } = require('pg');
const config = require('./config.json');
const redis = require('redis');

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

	/**
	 * for testing
	 */

	await subscriber.subscribe(`ship::wax::actions/contract/waxdaofarmer`, async (message) => {
		const block_num = JSON.parse(message).blocknum;
		const block_timestamp = JSON.parse(message).blocktimestamp;
		const date = new Date(blocktimestamp);
		const epoch_timestamp = Math.floor(date.getTime() / 1000);	
		console.log(`\nwaxdaofarmer action:\nblocknum: ${block_num}\nblock_timestamp: ${block_timestamp}`);
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

	await subscriber.subscribe(`ship::wax::actions/contract/${config.farm_contract}/name/createfarm`, async (message) => {
		try{
			const paused = await isPaused(client);

			if(!paused){
				//await handle_createfarm(message, postgresPool);
			} else {
				//await cache_createfarm(message, client);
			}
		} catch (e) {
			console.log(`error with createfarm: ${e}`);
		}
	})	
			      
    process.on('SIGINT', () => {
        client.quit();
        subscriber.quit();
        process.exit();
    });	
	
};

runApp();
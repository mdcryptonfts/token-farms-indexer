const handle_heartbeat = async (message, postgresPool) => {
    let postgresClient = null;

    try {

        const block_num = JSON.parse(message).blocknum;
        const head_block = JSON.parse(message).head_blocknum;

        postgresClient = await postgresPool.connect();

        try {
            const query = `
                INSERT INTO tokenfarms_health (id, last_updated_block, head_block)
                VALUES (0, $1, $2)
                ON CONFLICT (id)
                DO UPDATE SET last_updated_block = $1, head_block = $2;
            `;
            await postgresClient.query(query, [block_num, head_block]);
        } catch (e) {
            console.log(`error with heartbeat update: ${e}`)
        }

    } catch (e) {
        console.log(`error handling heartbeat: ${e}`);
    } finally {
        if (postgresClient) {
            postgresClient.release();
        }
    }
}

module.exports = {
    handle_heartbeat
}
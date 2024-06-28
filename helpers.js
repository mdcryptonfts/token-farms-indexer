const isRollbackInProgress = async (postgresPool) => {
    let postgresClient = null;
    let inProgress = false;

    try {

        postgresClient = await postgresPool.connect();

        const result = await postgresClient.query("SELECT current_setting('tokenfarms.rollback_is_in_progress', true) AS rollback_status");
        inProgress = result.rows[0].rollback_status == 'true';

    } catch (error) {
        console.log(`Error checking rollback status: ${error}`);
    } finally {
        if (postgresClient) {
            postgresClient.release();
        }
        return inProgress;        
    }
}


module.exports = {
    isRollbackInProgress
}
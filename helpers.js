const isRollbackInProgress = async (postgresClient) => {
    try {
        const result = await postgresClient.query("SELECT current_setting('tokenfarms.rollback_is_in_progress', true) AS rollback_status");
        return result.rows[0].rollback_status === 'true';
    } catch (error) {
        console.log(`Error checking rollback status: ${error}`);
        return false;
    }
}


module.exports = {
    isRollbackInProgress
}
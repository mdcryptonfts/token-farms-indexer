const isRollbackInProgress = async (postgresClient) => {
    try {
        const result = await postgresClient.query("SHOW tokenfarms.rollback_is_in_progress");
        return result.rows[0].tokenfarms_rollback_is_in_progress === 'true';
    } catch (error) {
        console.log(`Error checking rollback status: ${error}`);
        return false;
    }
}

module.exports = {
    isRollbackInProgress
}
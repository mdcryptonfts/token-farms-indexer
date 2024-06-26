const config = require('./config.json');

const isPaused = async (client) => {
  try {
    const value = await client.get(config.redis.rolling_back_key);
    if (value === 'true') {
      return true;
    } else if (value === null) {
      return false;
    } else {
      return false;
    }
  } catch (e) {
    console.error(`Error checking isPaused: ${e}`);
    throw e;
  }
}

module.exports = {
    isPaused
}
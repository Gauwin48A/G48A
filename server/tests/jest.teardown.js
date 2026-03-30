afterAll(async () => {
  try {
    const pool = require('../src/config/db');
    if (pool && typeof pool.end === 'function') {
      await pool.end();
    }
  } catch {
    // noop
  }

  try {
    const redisSession = require('../src/config/redisSession');
    if (redisSession && typeof redisSession.close === 'function') {
      await redisSession.close();
    }
  } catch {
    // noop
  }

  try {
    const redisCache = require('../src/config/redisCache');
    if (redisCache && typeof redisCache.close === 'function') {
      await redisCache.close();
    }
  } catch {
    // noop
  }
});

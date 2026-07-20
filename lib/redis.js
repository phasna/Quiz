const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  lazyConnect: true,
  retryStrategy: () => null // pas de reconnexion en boucle : on dégrade sans cache si Redis est indisponible
});

let connectionAttempted = false;

async function ensureConnected() {
  if (redis.status === 'ready') return true;
  if (connectionAttempted && redis.status !== 'end') return redis.status === 'ready';

  connectionAttempted = true;
  try {
    await redis.connect();
    return true;
  } catch (err) {
    console.warn(`Redis indisponible, cache de transformation désactivé (${err.message})`);
    return false;
  }
}

async function getCache(key) {
  if (!(await ensureConnected())) return null;
  try {
    return await redis.get(key);
  } catch (err) {
    console.warn(`Lecture Redis échouée: ${err.message}`);
    return null;
  }
}

async function setCache(key, value, ttlSeconds) {
  if (!(await ensureConnected())) return;
  try {
    await redis.set(key, value, 'EX', ttlSeconds);
  } catch (err) {
    console.warn(`Écriture Redis échouée: ${err.message}`);
  }
}

module.exports = { getCache, setCache };

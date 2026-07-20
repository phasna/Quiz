import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  lazyConnect: true,
  retryStrategy: () => null // pas de reconnexion en boucle : on dégrade sans cache si Redis est indisponible
});

let connectionAttempted = false;

async function ensureConnected(): Promise<boolean> {
  if (redis.status === 'ready') return true;
  if (connectionAttempted && redis.status !== 'end') return false;

  connectionAttempted = true;
  try {
    await redis.connect();
    return true;
  } catch (err) {
    console.warn(`Redis indisponible, cache de transformation désactivé (${(err as Error).message})`);
    return false;
  }
}

async function getCache(key: string): Promise<string | null> {
  if (!(await ensureConnected())) return null;
  try {
    return await redis.get(key);
  } catch (err) {
    console.warn(`Lecture Redis échouée: ${(err as Error).message}`);
    return null;
  }
}

async function setCache(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!(await ensureConnected())) return;
  try {
    await redis.set(key, value, 'EX', ttlSeconds);
  } catch (err) {
    console.warn(`Écriture Redis échouée: ${(err as Error).message}`);
  }
}

export default { getCache, setCache };

import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

export async function getTranslationCache(key) {
  return await redis.get(key);
}
export async function setTranslationCache(key, value, ttl = 3600) {
  await redis.set(key, value, 'EX', ttl);
}
export default redis;

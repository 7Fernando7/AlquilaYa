import { createClient, RedisClientType } from 'redis';
import { createLogger } from '../utils/logger';

const logger = createLogger('Redis');
let redisClient: RedisClientType | null = null;

export async function initializeRedis(): Promise<RedisClientType> {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const db = parseInt(process.env.REDIS_DB || '0');

    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    });

    redisClient.on('error', (err) => logger.error('Redis error:', err));
    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('disconnect', () => logger.warn('Redis disconnected'));

    await redisClient.connect();
    await redisClient.select(db);

    // Test connection
    const pong = await redisClient.ping();
    logger.info(`Redis PING response: ${pong}`);

    return redisClient;
  } catch (error) {
    logger.error('Redis initialization failed:', error);
    throw error;
  }
}

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export default redisClient;

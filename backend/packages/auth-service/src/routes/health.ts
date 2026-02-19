import { Router, Response } from 'express';
import { getConnection } from '../database/connection';
import { getRedisClient } from '../cache/redis';
import { createLogger } from '../utils/logger';

const logger = createLogger('Health-Check');

export function createHealthCheckRouter() {
  const router = Router();

  router.get('/', async (res: Response) => {
    try {
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          database: 'unknown',
          redis: 'unknown',
        },
      };

      // Check database
      try {
        const connection = getConnection();
        const result = await connection.query('SELECT 1');
        health.services.database = result ? 'up' : 'down';
      } catch (error) {
        logger.error('Database health check failed:', error);
        health.services.database = 'down';
      }

      // Check Redis
      try {
        const redis = getRedisClient();
        await redis.ping();
        health.services.redis = 'up';
      } catch (error) {
        logger.error('Redis health check failed:', error);
        health.services.redis = 'down';
      }

      const allServicesUp = Object.values(health.services).every(s => s === 'up');
      const statusCode = allServicesUp ? 200 : 503;

      return res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Health check failed:', error);
      return res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Health check failed',
      });
    }
  });

  return router;
}

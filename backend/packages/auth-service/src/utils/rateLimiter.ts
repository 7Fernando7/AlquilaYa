import { getRedisClient } from '../cache/redis';
import { RateLimitError } from './errors';
import { createLogger } from './logger';

const logger = createLogger('RateLimiter');

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxAttempts: number; // Max attempts within window
  keyPrefix: string; // Redis key prefix
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5,
  keyPrefix: 'ratelimit',
};

/**
 * Check if request is rate limited
 * @param identifier - Unique identifier (email, IP, etc.)
 * @param config - Rate limit configuration
 * @returns object - { allowed: boolean, attempts: number, resetTime: number }
 */
export async function checkRateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): Promise<{
  allowed: boolean;
  attempts: number;
  resetTime: number;
  retryAfter?: number;
}> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const redis = getRedisClient();
  const key = `${cfg.keyPrefix}:${identifier}`;
  const now = Date.now();

  try {
    // Get current attempt count
    const countStr = await redis.get(key);
    const attempts = countStr ? parseInt(countStr) : 0;

    if (attempts >= cfg.maxAttempts) {
      // Rate limited - get TTL to calculate reset time
      const ttl = await redis.ttl(key);
      const resetTime = now + (ttl * 1000);
      const retryAfter = Math.ceil(ttl);

      logger.warn(`Rate limit exceeded for ${identifier}: ${attempts} attempts`, {
        identifier,
        attempts,
        maxAttempts: cfg.maxAttempts,
        retryAfter,
      });

      return {
        allowed: false,
        attempts,
        resetTime,
        retryAfter,
      };
    }

    // Increment counter
    const newCount = attempts + 1;
    if (attempts === 0) {
      // First attempt - set expiry
      await redis.setEx(key, Math.ceil(cfg.windowMs / 1000), newCount.toString());
    } else {
      // Increment existing
      await redis.incr(key);
    }

    logger.debug(`Rate limit check for ${identifier}: ${newCount}/${cfg.maxAttempts}`);

    return {
      allowed: true,
      attempts: newCount,
      resetTime: now + cfg.windowMs,
    };
  } catch (error) {
    logger.error('Rate limiter error:', error);
    // If Redis fails, allow the request but log it
    return {
      allowed: true,
      attempts: 0,
      resetTime: now + cfg.windowMs,
    };
  }
}

/**
 * Reset rate limit counter for an identifier
 * @param identifier - Unique identifier to reset
 * @param keyPrefix - Redis key prefix
 */
export async function resetRateLimit(
  identifier: string,
  keyPrefix = 'ratelimit'
): Promise<void> {
  const redis = getRedisClient();
  const key = `${keyPrefix}:${identifier}`;

  try {
    await redis.del(key);
    logger.debug(`Rate limit reset for ${identifier}`);
  } catch (error) {
    logger.error('Failed to reset rate limit:', error);
  }
}

/**
 * Middleware for rate limiting login attempts
 */
export function loginRateLimitMiddleware(
  windowMs = 15 * 60 * 1000, // 15 minutes
  maxAttempts = 5
) {
  return async (req: any, res: any, next: any) => {
    const identifier = req.body?.email || req.ip;

    if (!identifier) {
      return next();
    }

    const result = await checkRateLimit(identifier, {
      windowMs,
      maxAttempts,
      keyPrefix: 'login_attempts',
    });

    if (!result.allowed) {
      throw new RateLimitError(
        'Too many login attempts. Please try again later.',
        result.retryAfter
      );
    }

    // Attach result to request for later use
    req.rateLimit = result;
    next();
  };
}

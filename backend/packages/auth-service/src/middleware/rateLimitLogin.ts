import { Request, Response, NextFunction } from 'express';
import { checkRateLimit } from '../utils/rateLimiter';
import { RateLimitError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('RateLimitLoginMiddleware');

/**
 * Rate limiting middleware for login endpoint
 * Limits: 5 attempts per 15 minutes per email/IP
 */
export async function rateLimitLogin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Use email if available, otherwise use IP
    const identifier = req.body?.email || req.ip || 'unknown';

    const result = await checkRateLimit(identifier, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxAttempts: 5,
      keyPrefix: 'login_attempts',
    });

    if (!result.allowed) {
      logger.warn(`Rate limit exceeded for login attempts: ${identifier}`, {
        attempts: result.attempts,
        retryAfter: result.retryAfter,
      });

      throw new RateLimitError(
        'Too many login attempts. Please try again later.',
        result.retryAfter
      );
    }

    // Attach result to request for potential later use
    (req as any).rateLimit = result;
    next();
  } catch (error) {
    next(error);
  }
}

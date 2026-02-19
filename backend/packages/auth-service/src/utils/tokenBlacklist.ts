/**
 * Token Blacklist Management
 * 
 * Manages JWT token blacklisting for logout functionality.
 * Stores blacklisted tokens in Redis with expiration set to token's exp claim.
 * 
 * Security considerations:
 * - Tokens are invalidated immediately upon logout
 * - Automatic cleanup when Redis TTL expires
 * - Graceful fallback if Redis unavailable (accept token but log warning)
 */

import { RedisClient } from '../cache/redis';
import { logger } from './logger';

const BLACKLIST_PREFIX = 'token_blacklist';
const REFRESH_BLACKLIST_PREFIX = 'refresh_blacklist';

/**
 * Add token to blacklist
 * @param token JWT token to blacklist
 * @param expiresAt Unix timestamp when token expires (in seconds)
 * @param tokenType 'access' or 'refresh'
 */
export async function blacklistToken(
  token: string,
  expiresAt: number,
  tokenType: 'access' | 'refresh' = 'access'
): Promise<void> {
  const redis = RedisClient.getInstance();

  if (!redis) {
    logger.warn('[TokenBlacklist] Redis unavailable, skipping token blacklist');
    return;
  }

  try {
    const prefix = tokenType === 'refresh' ? REFRESH_BLACKLIST_PREFIX : BLACKLIST_PREFIX;
    const key = `${prefix}:${token}`;

    // Calculate TTL: time until token expires (in seconds)
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(expiresAt - now, 1); // At least 1 second

    // Set token as blacklisted with expiration matching token expiry
    await redis.setex(key, ttl, '1');

    logger.info(`[TokenBlacklist] Token blacklisted (ttl: ${ttl}s, type: ${tokenType})`);
  } catch (error) {
    logger.error('[TokenBlacklist] Error blacklisting token:', error);
    // Don't throw - allow request to proceed but log the issue
  }
}

/**
 * Check if token is blacklisted
 * @param token JWT token to check
 * @param tokenType 'access' or 'refresh'
 * @returns true if token is blacklisted, false otherwise
 */
export async function isTokenBlacklisted(
  token: string,
  tokenType: 'access' | 'refresh' = 'access'
): Promise<boolean> {
  const redis = RedisClient.getInstance();

  if (!redis) {
    logger.warn('[TokenBlacklist] Redis unavailable, assuming token is valid');
    return false;
  }

  try {
    const prefix = tokenType === 'refresh' ? REFRESH_BLACKLIST_PREFIX : BLACKLIST_PREFIX;
    const key = `${prefix}:${token}`;

    const result = await redis.get(key);
    return result !== null;
  } catch (error) {
    logger.error('[TokenBlacklist] Error checking blacklist:', error);
    // Don't throw - allow request to proceed but log the issue
    return false;
  }
}

/**
 * Clear blacklist for a specific token type
 * Useful for testing or maintenance
 * @param tokenType 'access', 'refresh', or 'all'
 */
export async function clearBlacklist(tokenType: 'access' | 'refresh' | 'all' = 'all'): Promise<void> {
  const redis = RedisClient.getInstance();

  if (!redis) {
    logger.warn('[TokenBlacklist] Redis unavailable, cannot clear blacklist');
    return;
  }

  try {
    const keys: string[] = [];

    if (tokenType === 'access' || tokenType === 'all') {
      keys.push(`${BLACKLIST_PREFIX}:*`);
    }
    if (tokenType === 'refresh' || tokenType === 'all') {
      keys.push(`${REFRESH_BLACKLIST_PREFIX}:*`);
    }

    for (const pattern of keys) {
      // Note: In production, use SCAN instead of KEYS to avoid blocking
      const result = await redis.keys(pattern);
      if (result && result.length > 0) {
        await redis.del(...result);
      }
    }

    logger.info(`[TokenBlacklist] Blacklist cleared (types: ${tokenType})`);
  } catch (error) {
    logger.error('[TokenBlacklist] Error clearing blacklist:', error);
  }
}

/**
 * Get blacklist statistics (for monitoring)
 */
export async function getBlacklistStats(): Promise<{
  accessTokens: number;
  refreshTokens: number;
  total: number;
}> {
  const redis = RedisClient.getInstance();

  if (!redis) {
    return { accessTokens: 0, refreshTokens: 0, total: 0 };
  }

  try {
    const accessKeys = await redis.keys(`${BLACKLIST_PREFIX}:*`);
    const refreshKeys = await redis.keys(`${REFRESH_BLACKLIST_PREFIX}:*`);

    const accessCount = accessKeys?.length || 0;
    const refreshCount = refreshKeys?.length || 0;

    return {
      accessTokens: accessCount,
      refreshTokens: refreshCount,
      total: accessCount + refreshCount,
    };
  } catch (error) {
    logger.error('[TokenBlacklist] Error getting stats:', error);
    return { accessTokens: 0, refreshTokens: 0, total: 0 };
  }
}

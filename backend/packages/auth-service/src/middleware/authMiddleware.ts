/**
 * Authentication Middleware
 * 
 * Verifies JWT tokens in Authorization header and attaches user context to request.
 * Protects all routes requiring authentication.
 * 
 * Security features:
 * - Validates JWT signature and expiration
 * - Checks for token blacklist (logout tokens)
 * - Extracts Bearer token from Authorization header
 * - Returns 401 Unauthorized if token is missing or invalid
 * - Returns 403 Forbidden if token is blacklisted (logged out)
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { isTokenBlacklisted } from '../utils/tokenBlacklist';

// Extend Express Request to include user context
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        user_type: string;
        iat: number;
        exp: number;
      };
    }
  }
}

/**
 * Main authentication middleware
 * Place this on all protected routes
 * 
 * Example:
 *   app.get('/search', authMiddleware, (req, res) => { ... })
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.info('[Auth] Missing Authorization header');
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header is required',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    // Parse Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      logger.info('[Auth] Invalid Authorization header format');
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header must be in format: Bearer <token>',
        code: 'INVALID_TOKEN_FORMAT',
      });
      return;
    }

    const token = parts[1];

    // Verify JWT signature and expiration
    let decoded;
    try {
      const secret = process.env.JWT_SECRET || 'dev-secret-never-use-in-production';
      decoded = jwt.verify(token, secret) as any;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.info('[Auth] Token expired');
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED',
          expiredAt: error.expiredAt,
        });
        return;
      }

      if (error instanceof jwt.JsonWebTokenError) {
        logger.info('[Auth] Token verification failed:', error.message);
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Token is invalid',
          code: 'INVALID_TOKEN',
        });
        return;
      }

      throw error;
    }

    // Check if token is blacklisted (user logged out)
    const blacklisted = await isTokenBlacklisted(token, 'access');
    if (blacklisted) {
      logger.info('[Auth] Token is blacklisted (user logged out)');
      res.status(403).json({
        error: 'Forbidden',
        message: 'Token has been invalidated (you may have logged out)',
        code: 'TOKEN_BLACKLISTED',
      });
      return;
    }

    // Attach decoded token to request
    req.user = {
      id: decoded.sub || decoded.id, // Support both 'sub' and 'id' claims
      email: decoded.email,
      user_type: decoded.user_type,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    logger.debug(`[Auth] User authenticated: ${req.user.email}`);
    next();
  } catch (error) {
    logger.error('[Auth] Unexpected error in auth middleware:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during authentication',
      code: 'INTERNAL_ERROR',
    });
  }
}

/**
 * Optional: Role-based access control middleware
 * Usage: app.get('/admin', authMiddleware, requireRole('admin'), (req, res) => { ... })
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    if (req.user.user_type !== role) {
      logger.warn(`[Auth] User ${req.user.id} attempted to access ${role} endpoint with role ${req.user.user_type}`);
      res.status(403).json({
        error: 'Forbidden',
        message: `This resource requires ${role} role`,
        code: 'INSUFFICIENT_ROLE',
      });
      return;
    }

    next();
  };
}

/**
 * Optional: Optional authentication (doesn't fail if token missing)
 * Useful for endpoints that work with or without auth
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No token - that's ok, continue without user context
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      // Invalid format - that's ok, continue without user context
      next();
      return;
    }

    const token = parts[1];

    try {
      const secret = process.env.JWT_SECRET || 'dev-secret-never-use-in-production';
      const decoded = jwt.verify(token, secret) as any;

      // Check blacklist
      const blacklisted = await isTokenBlacklisted(token, 'access');
      if (!blacklisted) {
        req.user = {
          id: decoded.sub || decoded.id,
          email: decoded.email,
          user_type: decoded.user_type,
          iat: decoded.iat,
          exp: decoded.exp,
        };
      }
    } catch (error) {
      // Token is invalid or expired - that's ok, continue without user context
      logger.debug('[Auth] Optional auth: token invalid or expired, continuing without auth');
    }

    next();
  } catch (error) {
    logger.error('[Auth] Unexpected error in optional auth middleware:', error);
    // Don't fail - this is optional auth
    next();
  }
}

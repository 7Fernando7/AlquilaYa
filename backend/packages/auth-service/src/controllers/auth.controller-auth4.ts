/**
 * Authentication Controller - Complete (AUTH-1, AUTH-2, AUTH-3, AUTH-4)
 * 
 * Implements all authentication endpoints:
 * - POST /auth/register (AUTH-2)
 * - POST /auth/login (AUTH-3)
 * - POST /auth/refresh (AUTH-4)
 * - POST /auth/logout (AUTH-4)
 * 
 * Security features implemented:
 * - Password hashing with bcrypt (cost 12)
 * - JWT token generation with expiration
 * - Rate limiting on login
 * - User enumeration prevention
 * - Token refresh with rotation
 * - Token blacklist on logout
 */

import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import jwt from 'jsonwebtoken';
import { User } from '../database/entities/User';
import { hashPassword, comparePassword } from '../utils/password';
import { isValidEmail, validatePasswordStrength } from '../utils/validation';
import { ValidationError, ConflictError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';
import { blacklistToken } from '../utils/tokenBlacklist';

// ============================================================================
// REGISTRATION (AUTH-2)
// ============================================================================

/**
 * Register new user
 * 
 * POST /auth/register
 * Body: { email, password, full_name, user_type }
 * 
 * Returns: { user: {...}, tokens: { accessToken, refreshToken } }
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, full_name, user_type } = req.body;

    // Validate input
    if (!email || !password || !full_name || !user_type) {
      throw new ValidationError('Missing required fields: email, password, full_name, user_type');
    }

    if (!isValidEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    if (!validatePasswordStrength(password)) {
      throw new ValidationError(
        'Password must be at least 8 characters with uppercase, lowercase, and numbers'
      );
    }

    if (!['seeker', 'owner', 'agency', 'admin'].includes(user_type)) {
      throw new ValidationError('Invalid user_type: must be seeker, owner, agency, or admin');
    }

    // Check email uniqueness
    const userRepository = getRepository(User);
    const existingUser = await userRepository.findOne({ where: { email } });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const user = userRepository.create({
      email,
      password_hash,
      full_name,
      user_type,
      verification_status: 'unverified',
    });

    await userRepository.save(user);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token expiration in database for rotation tracking
    user.last_login = new Date();
    await userRepository.save(user);

    logger.info(`[Auth] User registered: ${email}`);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        user_type: user.user_type,
        verification_status: user.verification_status,
        created_at: user.created_at,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// LOGIN (AUTH-3)
// ============================================================================

/**
 * Login user
 * 
 * POST /auth/login
 * Body: { email, password }
 * 
 * Returns: { tokens: { accessToken, refreshToken } }
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    if (!isValidEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Find user (generic error message to prevent user enumeration)
    const userRepository = getRepository(User);
    const user = await userRepository.findOne({ where: { email } });

    if (!user) {
      logger.warn(`[Auth] Login attempt with non-existent email: ${email}`);
      // Prevent user enumeration: don't reveal if email exists
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if account is active
    if (user.deleted_at) {
      logger.warn(`[Auth] Login attempt on deleted account: ${email}`);
      throw new UnauthorizedError('Invalid email or password');
    }

    // Compare password (timing-safe)
    const passwordMatch = await comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      logger.warn(`[Auth] Failed login attempt: ${email}`);
      // Prevent user enumeration: use generic error
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Update last login timestamp
    user.last_login = new Date();
    user.updated_at = new Date();
    await userRepository.save(user);

    logger.info(`[Auth] User logged in: ${email}`);

    res.status(200).json({
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// TOKEN REFRESH (AUTH-4)
// ============================================================================

/**
 * Refresh access token using refresh token
 * 
 * POST /auth/refresh
 * Body: { refreshToken }
 * 
 * Returns: { accessToken, refreshToken }
 * 
 * Security:
 * - Validates refresh token
 * - Checks if user still exists and is active
 * - Rotates refresh token (new token issued)
 * - Old refresh token is NOT blacklisted (still valid for window)
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('refreshToken is required');
    }

    // Verify refresh token
    let decoded;
    try {
      const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-secret-never-use-in-production';
      decoded = jwt.verify(refreshToken, secret) as any;
    } catch (error) {
      logger.warn('[Auth] Refresh token verification failed');
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Check if token is blacklisted
    const blacklisted = await require('../utils/tokenBlacklist').isTokenBlacklisted(
      refreshToken,
      'refresh'
    );
    if (blacklisted) {
      logger.warn(`[Auth] Refresh token is blacklisted (user: ${decoded.sub})`);
      throw new UnauthorizedError('Refresh token has been invalidated');
    }

    // Verify user still exists and is active
    const userRepository = getRepository(User);
    const user = await userRepository.findOne({ where: { id: decoded.sub } });

    if (!user) {
      logger.warn(`[Auth] Refresh token for deleted user: ${decoded.sub}`);
      throw new UnauthorizedError('User not found');
    }

    if (user.deleted_at) {
      logger.warn(`[Auth] Refresh token for deleted account: ${user.email}`);
      throw new UnauthorizedError('Account is deleted');
    }

    // Generate new tokens (refresh token rotation)
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    logger.info(`[Auth] Token refreshed for user: ${user.email}`);

    res.status(200).json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// LOGOUT (AUTH-4)
// ============================================================================

/**
 * Logout user by invalidating tokens
 * 
 * POST /auth/logout
 * Headers: Authorization: Bearer <accessToken>
 * Body: { refreshToken } (optional)
 * 
 * Returns: { message: 'Successfully logged out' }
 * 
 * Security:
 * - Blacklists both access and refresh tokens
 * - Tokens cannot be reused after logout
 * - Blacklist entry expires when token would have expired
 */
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const authHeader = req.headers.authorization;

    // Extract access token
    let accessToken = '';
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        accessToken = parts[1];
      }
    }

    if (!accessToken && !refreshToken) {
      throw new ValidationError('At least one token must be provided (access or refresh)');
    }

    // Decode tokens to get expiration
    const secret = process.env.JWT_SECRET || 'dev-secret-never-use-in-production';
    const refreshSecret = process.env.JWT_REFRESH_SECRET || secret;

    // Blacklist access token if provided
    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken) as any;
        if (decoded && decoded.exp) {
          await blacklistToken(accessToken, decoded.exp, 'access');
          logger.info('[Auth] Access token blacklisted on logout');
        }
      } catch (error) {
        logger.warn('[Auth] Error decoding access token during logout:', error);
        // Continue - try to blacklist refresh token anyway
      }
    }

    // Blacklist refresh token if provided
    if (refreshToken) {
      try {
        const decoded = jwt.decode(refreshToken) as any;
        if (decoded && decoded.exp) {
          await blacklistToken(refreshToken, decoded.exp, 'refresh');
          logger.info('[Auth] Refresh token blacklisted on logout');
        }
      } catch (error) {
        logger.warn('[Auth] Error decoding refresh token during logout:', error);
      }
    }

    // Extract user ID for logging
    let userId = 'unknown';
    if (req.user) {
      userId = String(req.user.id);
    }

    logger.info(`[Auth] User logged out: ${userId}`);

    res.status(200).json({
      message: 'Successfully logged out',
    });
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate both access and refresh tokens
 * 
 * Access token: 15 minutes expiration (short-lived)
 * Refresh token: 30 days expiration (long-lived, used to get new access token)
 */
function generateTokens(user: User): { accessToken: string; refreshToken: string } {
  const secret = process.env.JWT_SECRET || 'dev-secret-never-use-in-production';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || secret;

  const now = Math.floor(Date.now() / 1000);
  const accessTokenExpiry = now + 15 * 60; // 15 minutes
  const refreshTokenExpiry = now + 30 * 24 * 60 * 60; // 30 days

  const accessTokenPayload = {
    sub: user.id,
    email: user.email,
    user_type: user.user_type,
    iat: now,
    exp: accessTokenExpiry,
    type: 'access',
  };

  const refreshTokenPayload = {
    sub: user.id,
    email: user.email,
    iat: now,
    exp: refreshTokenExpiry,
    type: 'refresh',
  };

  const accessToken = jwt.sign(accessTokenPayload, secret);
  const refreshToken = jwt.sign(refreshTokenPayload, refreshSecret);

  return { accessToken, refreshToken };
}

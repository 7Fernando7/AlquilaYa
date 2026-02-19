import jwt from 'jsonwebtoken';
import { createLogger } from './logger';

const logger = createLogger('JWT-Utils');

export interface TokenPayload {
  userId: number;
  email: string;
  userType: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-never-use-in-production';
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_TOKEN_EXPIRY || '30d';

/**
 * Generate an access token
 * @param payload - Token payload
 * @returns string - Signed JWT token
 */
export function generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY as any,
      algorithm: 'HS256' as any,
    });
  } catch (error) {
    logger.error('Failed to generate access token:', error);
    throw new Error('Failed to generate access token');
  }
}

/**
 * Generate a refresh token
 * @param payload - Token payload
 * @returns string - Signed JWT token
 */
export function generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY as any,
      algorithm: 'HS256' as any,
    });
  } catch (error) {
    logger.error('Failed to generate refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
}

/**
 * Verify and decode a token
 * @param token - JWT token to verify
 * @returns TokenPayload - Decoded token payload
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn(`Token expired: ${error.message}`);
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn(`Invalid token: ${error.message}`);
      throw new Error('Invalid token');
    }
    logger.error('Token verification failed:', error);
    throw new Error('Failed to verify token');
  }
}

/**
 * Decode a token without verifying signature
 * Useful for checking token structure without validation
 * @param token - JWT token to decode
 * @returns TokenPayload - Decoded payload
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload | null;
  } catch (error) {
    logger.error('Token decoding failed:', error);
    return null;
  }
}

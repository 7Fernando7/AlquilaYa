import { Router, Request, Response, NextFunction } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
} from '../controllers/auth.controller-updated';
import { rateLimitLogin } from '../middleware/rateLimitLogin';

const router = Router();

/**
 * POST /auth/register
 * Register a new user
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePass123",
 *   "full_name": "John Doe",
 *   "user_type": "seeker"  // or "owner", "agency", "admin"
 * }
 *
 * Success response (201):
 * {
 *   "user": {
 *     "id": 1,
 *     "email": "user@example.com",
 *     "full_name": "John Doe",
 *     "user_type": "seeker",
 *     "verification_status": "unverified",
 *     "created_at": "2026-02-18T..."
 *   },
 *   "tokens": {
 *     "accessToken": "eyJhbGc...",
 *     "refreshToken": "eyJhbGc..."
 *   }
 * }
 *
 * Error response (400):
 * {
 *   "error": "Registration validation failed",
 *   "message": "Registration validation failed",
 *   "code": "VALIDATION_ERROR",
 *   "details": {
 *     "email": "Email format is invalid",
 *     "password": "Password must contain..."
 *   }
 * }
 *
 * Error response (409):
 * {
 *   "error": "Email already registered",
 *   "message": "Email already registered",
 *   "code": "CONFLICT",
 *   "details": {
 *     "email": "user@example.com",
 *     "suggestion": "Try logging in or use a different email address"
 *   }
 * }
 */
router.post('/register', register);

/**
 * POST /auth/login
 * Authenticate user and return tokens
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePass123"
 * }
 *
 * Success response (200):
 * {
 *   "user": {
 *     "id": 1,
 *     "email": "user@example.com",
 *     "full_name": "John Doe",
 *     "user_type": "seeker",
 *     "verification_status": "unverified",
 *     "created_at": "2026-02-18T..."
 *   },
 *   "tokens": {
 *     "accessToken": "eyJhbGc...",
 *     "refreshToken": "eyJhbGc..."
 *   }
 * }
 *
 * Error response (400):
 * {
 *   "error": "Invalid email or password",
 *   "message": "Invalid email or password",
 *   "code": "VALIDATION_ERROR"
 * }
 *
 * Error response (429 - Rate Limited):
 * {
 *   "error": "Too many login attempts. Please try again later.",
 *   "message": "Too many login attempts. Please try again later.",
 *   "code": "RATE_LIMITED",
 *   "details": {
 *     "retryAfter": 300
 *   }
 * }
 *
 * Rate Limit: 5 attempts per 15 minutes per email/IP
 */
router.post('/login', rateLimitLogin, login);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 * (Implementation in AUTH-4)
 */
router.post('/refresh', (req: Request, res: Response, next: NextFunction) => {
  refreshToken(req, res, next);
});

/**
 * POST /auth/logout
 * Invalidate user's tokens
 * (Implementation in AUTH-4)
 */
router.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  logout(req, res, next);
});

export default router;

/**
 * Authentication Routes - Complete (AUTH-1, AUTH-2, AUTH-3, AUTH-4)
 * 
 * Routes for all authentication endpoints:
 * - POST /auth/register (public)
 * - POST /auth/login (public, rate-limited)
 * - POST /auth/refresh (public)
 * - POST /auth/logout (protected)
 * 
 * Middleware stack:
 * - Rate limiting on login endpoint
 * - Error handling for all endpoints
 * - Authentication on protected endpoints
 */

import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
} from '../controllers/auth.controller-auth4';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitLogin } from '../middleware/rateLimitLogin';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// ============================================================================
// PUBLIC ENDPOINTS (no authentication required)
// ============================================================================

/**
 * POST /auth/register
 * Register a new user
 * 
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "MyPassword123!",
 *   "full_name": "John Doe",
 *   "user_type": "seeker" | "owner" | "agency" | "admin"
 * }
 * 
 * Response (201):
 * {
 *   "user": {
 *     "id": 1,
 *     "email": "user@example.com",
 *     "full_name": "John Doe",
 *     "user_type": "seeker",
 *     "verification_status": "unverified",
 *     "created_at": "2026-02-18T10:00:00Z"
 *   },
 *   "tokens": {
 *     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *   }
 * }
 * 
 * Errors:
 * - 400: Missing required fields, invalid email, weak password
 * - 409: Email already registered
 * - 500: Database error
 * 
 * Security:
 * - Password must be at least 8 characters with uppercase, lowercase, numbers
 * - Email must be valid RFC 5322 format
 * - User type restricted to allowed values
 */
router.post('/register', asyncHandler(register));

/**
 * POST /auth/login
 * Authenticate user and get tokens
 * 
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "MyPassword123!"
 * }
 * 
 * Response (200):
 * {
 *   "tokens": {
 *     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *   }
 * }
 * 
 * Errors:
 * - 400: Invalid email format, missing credentials
 * - 401: Invalid email or password
 * - 429: Too many login attempts (rate limited)
 * - 500: Server error
 * 
 * Rate limiting:
 * - 5 attempts per 15 minutes per email/IP
 * - Returns 429 with retry-after header when exceeded
 * 
 * Security:
 * - Timing-safe password comparison (no timing attacks)
 * - Generic error message (no user enumeration)
 * - Rate limiting prevents brute force
 * - Session tracking (last_login updated)
 * 
 * Examples:
 * 
 * curl -X POST http://localhost:3001/auth/login \
 *   -H \"Content-Type: application/json\" \
 *   -d '{\n    \"email\": \"user@example.com\",\n    \"password\": \"MyPassword123!\"\n  }'\n * \n * Response:\n * {\n *   \"tokens\": {\n *     \"accessToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\",\n *     \"refreshToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"\n *   }\n * }\n * \n * Rate limit exceeded:\n * {\n *   \"error\": \"Too Many Requests\",\n *   \"message\": \"Maximum 5 login attempts per 15 minutes\",\n *   \"code\": \"RATE_LIMITED\",\n *   \"retryAfter\": 600,\n *   \"attempts\": 6,\n *   \"resetTime\": \"2026-02-18T10:15:00Z\"\n * }\n */\nrouter.post('/login', asyncHandler(rateLimitLogin), asyncHandler(login));

/**\n * POST /auth/refresh\n * Get new access token using refresh token\n * \n * Request body:\n * {\n *   \"refreshToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"\n * }\n * \n * Response (200):\n * {\n *   \"accessToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\",\n *   \"refreshToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"\n * }\n * \n * Errors:\n * - 400: Missing refreshToken\n * - 401: Invalid or expired refresh token\n * - 500: Server error\n * \n * Security:\n * - Refresh token must be valid and not expired\n * - Refresh token must not be blacklisted\n * - User must still exist and be active\n * - Token rotation: old refresh token can still be used (during transition window)\n * - New refresh token issued with each refresh\n * \n * Examples:\n * \n * curl -X POST http://localhost:3001/auth/refresh \\\n *   -H \"Content-Type: application/json\" \\\n *   -d '{\"refreshToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"}'\n * \n * Response:\n * {\n *   \"accessToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\",\n *   \"refreshToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"\n * }\n * \n * Invalid token:\n * {\n *   \"error\": \"Unauthorized\",\n *   \"message\": \"Invalid or expired refresh token\",\n *   \"code\": \"UNAUTHORIZED\"\n * }\n */\nrouter.post('/refresh', asyncHandler(refresh));\n\n// ============================================================================\n// PROTECTED ENDPOINTS (authentication required)\n// ============================================================================\n\n/**\n * POST /auth/logout\n * Invalidate user's tokens\n * \n * Headers:\n * Authorization: Bearer <accessToken>\n * \n * Request body:\n * {\n *   \"refreshToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"  // optional\n * }\n * \n * Response (200):\n * {\n *   \"message\": \"Successfully logged out\"\n * }\n * \n * Errors:\n * - 400: No tokens provided\n * - 401: Invalid or missing access token\n * - 500: Server error\n * \n * Security:\n * - Access token is blacklisted immediately\n * - Refresh token is blacklisted if provided\n * - Blacklist entries expire when tokens would have expired\n * - Cannot reuse tokens after logout\n * - User must provide valid access token\n * \n * Behavior:\n * - Blacklists both access and refresh tokens\n * - Prevents token reuse (e.g., if tokens were compromised)\n * - User must login again to get new tokens\n * - Graceful handling if only access token or only refresh token provided\n * \n * Examples:\n * \n * Logout with access token only:\n * curl -X POST http://localhost:3001/auth/logout \\\n *   -H \"Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"\n * \n * Logout with both tokens:\n * curl -X POST http://localhost:3001/auth/logout \\\n *   -H \"Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\" \\\n *   -H \"Content-Type: application/json\" \\\n *   -d '{\"refreshToken\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"}'\n * \n * Response:\n * {\n *   \"message\": \"Successfully logged out\"\n * }\n */\nrouter.post('/logout', asyncHandler(authMiddleware), asyncHandler(logout));\n\nexport default router;\n
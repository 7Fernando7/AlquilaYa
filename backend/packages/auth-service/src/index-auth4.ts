/**
 * Auth Service Entry Point - Complete (AUTH-1, AUTH-2, AUTH-3, AUTH-4)
 * 
 * Initializes Express server with:
 * - Database connections (PostgreSQL, Redis)
 * - Middleware stack (CORS, logging, parsing, error handling)
 * - Authentication routes (register, login, refresh, logout)
 * - Protected route example (/protected - requires valid JWT)
 * - Health check endpoint
 * 
 * All authentication functionality is available immediately after startup.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import 'reflect-metadata';
import { createConnection } from 'typeorm';

// Import routes
import authRoutes from './routes/auth-auth4';
import healthRoutes from './routes/health';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/authMiddleware';
import { logger } from './utils/logger';

// Import utilities
import { RedisClient } from './cache/redis';

// Type definitions
interface StartServerOptions {
  port?: number;
  env?: string;
}

/**
 * Start Express server with all services
 */
async function startServer(options: StartServerOptions = {}): Promise<Express> {
  const port = options.port || parseInt(process.env.PORT || '3001', 10);
  const env = options.env || process.env.NODE_ENV || 'development';

  const app = express();

  logger.info(`[Server] Starting Auth Service in ${env} mode...`);

  try {
    // ========================================================================
    // INITIALIZE EXTERNAL SERVICES
    // ========================================================================

    // Initialize Redis
    logger.info('[Server] Initializing Redis connection...');
    const redis = RedisClient.getInstance();
    await redis.ping();
    logger.info('[Server] Redis connected successfully');

    // Initialize PostgreSQL
    logger.info('[Server] Initializing PostgreSQL connection...');
    await createConnection({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'formacionia',
      entities: [__dirname + '/database/entities/**/*.ts'],
      migrations: [__dirname + '/database/migrations/**/*.ts'],
      synchronize: false, // Use migrations instead
      logging: false,
    });
    logger.info('[Server] PostgreSQL connected successfully');

    // ========================================================================
    // MIDDLEWARE STACK
    // ========================================================================

    // CORS configuration
    app.use(
      cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
      })
    );
    logger.info('[Server] CORS configured');

    // Body parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));
    logger.info('[Server] Body parsing configured');

    // Request logging middleware (skip health checks)
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path !== '/health') {
        logger.debug(`[Request] ${req.method} ${req.path}`);
      }
      next();
    });

    // ========================================================================
    // ROUTES
    // ========================================================================

    // Health check (public)
    app.use('/health', healthRoutes);
    logger.info('[Server] Health check route registered');

    // Authentication routes (public + protected)
    app.use('/auth', authRoutes);
    logger.info('[Server] Authentication routes registered');

    // ========================================================================
    // PROTECTED ROUTE EXAMPLES
    // ========================================================================

    /**
     * Example protected endpoint
     * Requires: Authorization: Bearer <valid-jwt-token>
     * Usage: GET /protected
     */
    app.get('/protected', authMiddleware, (req: Request, res: Response) => {
      res.status(200).json({
        message: 'This is a protected endpoint',
        user: req.user,
        timestamp: new Date().toISOString(),
      });
    });
    logger.info('[Server] Protected route example registered');

    /**
     * Search service placeholder (will be actual search service)
     * Requires: Authorization: Bearer <valid-jwt-token>
     * Usage: GET /search/properties?city=Madrid
     */
    app.get('/search/properties', authMiddleware, (req: Request, res: Response) => {
      res.status(200).json({
        message: 'Search endpoint requires search service',
        user: req.user?.email,
        query: req.query,
      });
    });

    // ========================================================================
    // ERROR HANDLING
    // ========================================================================

    // 404 handler
    app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        code: 'NOT_FOUND',
      });
    });

    // Global error handler (must be last)
    app.use(errorHandler);
    logger.info('[Server] Error handling middleware configured');

    // ========================================================================
    // START SERVER
    // ========================================================================

    return new Promise((resolve, reject) => {
      const server = app.listen(port, () => {
        logger.info(`[Server] ✓ Auth Service running on port ${port}`);
        logger.info(`[Server] API documentation:`);
        logger.info(`[Server]   - Health check: GET http://localhost:${port}/health`);
        logger.info(`[Server]   - Register: POST http://localhost:${port}/auth/register`);
        logger.info(`[Server]   - Login: POST http://localhost:${port}/auth/login`);
        logger.info(`[Server]   - Refresh: POST http://localhost:${port}/auth/refresh`);
        logger.info(`[Server]   - Logout: POST http://localhost:${port}/auth/logout`);
        logger.info(`[Server]   - Protected: GET http://localhost:${port}/protected`);
        logger.info('[Server] Ready to accept requests');
        resolve(app);
      });

      server.on('error', (error) => {
        logger.error('[Server] Server error:', error);
        reject(error);
      });
    });
  } catch (error) {
    logger.error('[Server] Failed to start server:', error);
    throw error;
  }
}

/**
 * CLI entry point
 */
if (require.main === module) {
  startServer()
    .then(() => {
      logger.info('[Server] Auth Service started successfully');
    })
    .catch((error) => {
      logger.error('[Server] Fatal error:', error);
      process.exit(1);
    });
}

export default startServer;
export { startServer };

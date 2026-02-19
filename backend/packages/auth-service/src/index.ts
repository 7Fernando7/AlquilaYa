import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger } from './utils/logger';
import { initializeDatabase } from './database/connection';
import { initializeRedis } from './cache/redis';
import { createHealthCheckRouter } from './routes/health';
import authRoutes from './routes/auth';

// Load environment variables
dotenv.config();

const app = express();
const logger = createLogger('Auth-Service');

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: process.env.CORS_CREDENTIALS === 'true',
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check route (before auth middleware)
app.use('/health', createHealthCheckRouter());

// Ping route (simple liveness check)
app.get('/ping', (_req, res) => {
  res.json({ message: 'pong' });
});

// Auth routes
app.use('/auth', authRoutes);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Initialize services
async function start() {
  try {
    logger.info('🚀 Starting Auth Service...');

    // Initialize database
    logger.info('📦 Connecting to PostgreSQL...');
    await initializeDatabase();
    logger.info('✅ PostgreSQL connected');

    // Initialize Redis (skip in development)
    if (process.env.NODE_ENV !== 'development') {
      logger.info('🔄 Connecting to Redis...');
      await initializeRedis();
      logger.info('✅ Redis connected');
    } else {
      logger.info('⏭️ Redis initialization skipped (development mode)');
    }

    // Start server
    const PORT = process.env.PORT || 3001;
    const server = app.listen(PORT, () => {
      logger.info(`✅ Auth Service running on port ${PORT}`);
      logger.info(`🌐 Environment: ${process.env.NODE_ENV}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start Auth Service:', error);
    process.exit(1);
  }
}

start();

export default app;

import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode, InternalError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('ErrorHandler');

/**
 * Global error handling middleware
 * Converts all errors to standardized error responses
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.code}`, {
      message: err.message,
      statusCode: err.statusCode,
      details: err.details,
    });
  } else {
    logger.error('Unhandled error:', err);
  }

  // Convert to AppError if not already
  let appError: AppError;
  if (err instanceof AppError) {
    appError = err;
  } else {
    appError = new InternalError(
      process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      process.env.NODE_ENV === 'development'
        ? {
            originalError: err.message,
            stack: err.stack,
          }
        : undefined
    );
  }

  // Send error response
  res.status(appError.statusCode).json({
    error: appError.message,
    message: appError.message,
    code: appError.code,
    ...(appError.details && { details: appError.details }),
  });
}

/**
 * Async error wrapper for route handlers
 * Catches errors in async handlers and passes to error middleware
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

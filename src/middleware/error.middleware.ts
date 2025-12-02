import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

interface ErrorResponse {
  status: string;
  message: string;
  errors?: any;
  stack?: string;
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  const response: ErrorResponse = {
    status: 'error',
    message: err.message || 'Internal Server Error',
  };

  // Validation errors
  if (err.name === 'ValidationError') {
    response.message = 'Validation Error';
    response.errors = Object.values(err.errors).map((e: any) => e.message);
  }

  // Duplicate key error
  if (err.code === 11000) {
    response.message = 'Duplicate field value entered';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    response.message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    response.message = 'Token expired';
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

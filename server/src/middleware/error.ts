import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/AppError.js';
import { env } from '../config/env.js';

export const notFoundHandler: ErrorRequestHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, { statusCode: 404 }));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Prisma known errors → user-friendly messages
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      res.status(409).json({
        error: {
          code: 'UNIQUE_CONSTRAINT',
          message: `A record with that ${target} already exists.`,
        },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found.' } });
      return;
    }
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof AppError ? err.message : 'Internal server error';

  if (statusCode >= 500) {
    req.log?.error({ err, url: req.originalUrl }, 'unhandled error');
  } else {
    req.log?.warn({ err, url: req.originalUrl }, 'request error');
  }

  res.status(statusCode).json({
    error: {
      code: err?.code ?? (statusCode >= 500 ? 'INTERNAL' : 'REQUEST'),
      message,
      ...(err?.details !== undefined ? { details: err.details } : {}),
      ...(env.NODE_ENV === 'development' && statusCode >= 500 ? { stack: err?.stack } : {}),
    },
  });
};

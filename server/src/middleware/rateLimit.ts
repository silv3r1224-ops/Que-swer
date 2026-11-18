import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { tooMany } from '../lib/AppError.js';

const limiter = (limit: number, windowMs = 15 * 60 * 1000) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: undefined, // we throw via handler below
    handler: (_req, _res, _next, options) => {
      throw tooMany();
    },
    skip: () => env.NODE_ENV === 'test',
  });

export const authLimiter = limiter(env.RATE_LIMIT_AUTH);
export const writeLimiter = limiter(env.RATE_LIMIT_WRITE);

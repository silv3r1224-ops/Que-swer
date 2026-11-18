import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../config/db.js';
import { forbidden, unauthorized } from '../lib/AppError.js';
import { verifyAccessToken, type AccessTokenPayload } from '../utils/jwt.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: Role;
      };
    }
  }
}

const extractBearer = (header: string | undefined): string | null => {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
};

/** Requires a valid Bearer access token; attaches req.user. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractBearer(req.headers.authorization);
    if (!token) throw unauthorized('Missing bearer token');

    let payload: AccessTokenPayload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw unauthorized('Invalid or expired token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.isBanned) throw unauthorized('Account not found or banned');

    req.user = { id: user.id, username: user.username, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
};

/** Attaches req.user when a valid token is present, but never rejects. */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractBearer(req.headers.authorization);
    if (!token) return next();
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user && !user.isBanned) {
      req.user = { id: user.id, username: user.username, role: user.role };
    }
    next();
  } catch {
    next();
  }
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };

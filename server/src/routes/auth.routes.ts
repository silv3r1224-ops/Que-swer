import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError, conflict, unauthorized } from '../lib/AppError.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { signAccessToken } from '../utils/jwt.js';
import {
  decodeRefreshToken,
  issueRefreshToken,
  refreshCookieName,
  refreshCookieOptions,
  revokeRefreshToken,
  rotateRefreshToken,
} from '../utils/tokens.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email().max(255),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers and underscores only'),
  displayName: z.string().min(1).max(60),
  password: z
    .string()
    .min(8)
    .max(72)
    .regex(/[a-zA-Z]/, 'Must include a letter')
    .regex(/\d/, 'Must include a number'),
});

const loginSchema = z.object({
  identifier: z.string().min(1).max(255), // email or username
  password: z.string().min(1).max(72),
});

const refreshSchema = z.object({
  token: z.string().min(1).optional(),
});

router.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const { email, username, displayName, password } = req.body;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { id: true },
    });
    if (existing) throw conflict('Email or username already taken');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, username, displayName, passwordHash },
      select: { id: true, role: true, username: true },
    });

    // First user on the system becomes admin (bootstrap); everyone else is student.
    const count = await prisma.user.count();
    if (count === 1) {
      await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
    }

    const refreshToken = await issueRefreshToken(user.id);
    const accessToken = signAccessToken({ sub: user.id, role: user.role, username: user.username });

    res.cookie(refreshCookieName, refreshToken, refreshCookieOptions);
    res
      .status(201)
      .json({ accessToken, user: { id: user.id, username: user.username, role: user.role } });
  }),
);

router.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
    });
    if (!user || user.isBanned) throw unauthorized('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw unauthorized('Invalid credentials');

    const refreshToken = await issueRefreshToken(user.id);
    const accessToken = signAccessToken({ sub: user.id, role: user.role, username: user.username });

    res.cookie(refreshCookieName, refreshToken, refreshCookieOptions);
    res.json({
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
  }),
);

router.post(
  '/refresh',
  validate({ body: refreshSchema }),
  asyncHandler(async (req, res) => {
    const token = req.body.token ?? req.cookies?.[refreshCookieName];
    if (!token) throw unauthorized('Refresh token missing');

    const payload = decodeRefreshToken(token);
    const nextToken = await rotateRefreshToken(token);
    res.cookie(refreshCookieName, nextToken, refreshCookieOptions);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, username: true },
    });
    if (!user) throw unauthorized('Account not found');

    const accessToken = signAccessToken({ sub: user.id, role: user.role, username: user.username });
    res.json({ accessToken, user });
  }),
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[refreshCookieName] ?? req.body?.token;
    if (token) await revokeRefreshToken(token);
    res.clearCookie(refreshCookieName, refreshCookieOptions);
    res.status(204).end();
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        reputation: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    if (!user) throw new AppError('Account not found', { statusCode: 404 });
    res.json({ user });
  }),
);

export default router;

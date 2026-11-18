import crypto from 'node:crypto';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { signRefreshToken, verifyRefreshToken } from './jwt.js';
import { unauthorized } from '../lib/AppError.js';

export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Creates a refresh-token record and returns the signed cookie value.
 * Only the SHA-256 hash is stored, so a DB leak does not expose usable tokens.
 */
export async function issueRefreshToken(userId: string): Promise<string> {
  const id = crypto.randomUUID();
  const token = signRefreshToken({ sub: userId, tid: id });
  await prisma.refreshToken.create({
    data: {
      id,
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

/** Verifies a refresh token without rotating it; returns its payload. */
export function decodeRefreshToken(token: string): { sub: string; tid: string } {
  try {
    return verifyRefreshToken(token);
  } catch {
    throw unauthorized('Invalid refresh token');
  }
}

/**
 * Validates a refresh token, rotates it (revokes the old hash, issues a new
 * one), and returns the new cookie value. Old tokens are single-use.
 */
export async function rotateRefreshToken(token: string): Promise<string> {
  let payload: { sub: string; tid: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw unauthorized('Invalid refresh token');
  }

  const record = await prisma.refreshToken.findUnique({ where: { id: payload.tid } });
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw unauthorized('Refresh token has expired or been revoked');
  }

  const next = await issueRefreshToken(record.userId);

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  return next;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  try {
    const payload = verifyRefreshToken(token);
    await prisma.refreshToken.updateMany({
      where: { id: payload.tid, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    // already invalid/expired — nothing to revoke
  }
}

export const refreshCookieName = 'qs_refresh';
export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

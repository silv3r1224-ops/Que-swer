import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/AppError.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { parsePagination, buildPageMeta } from '../utils/pagination.js';

const router = Router();

const createMessageSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(5_000),
});

// Public: submit a contact message
router.post(
  '/',
  writeLimiter,
  validate({ body: createMessageSchema }),
  asyncHandler(async (req, res) => {
    const message = await prisma.message.create({
      data: req.body,
      select: { id: true, createdAt: true },
    });
    res.status(201).json({ message });
  }),
);

// Admin only: inbox
router.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, orderBy, skip, take } = parsePagination(req.query, [
      'createdAt',
      'status',
    ]);
    const [total, messages] = await Promise.all([
      prisma.message.count(),
      prisma.message.findMany({ orderBy, skip, take }),
    ]);
    res.json({ messages, meta: buildPageMeta(total, page, pageSize) });
  }),
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const status = typeof req.body?.status === 'string' ? req.body.status : undefined;
    if (!status || !['NEW', 'READ', 'ARCHIVED'].includes(status)) {
      res
        .status(400)
        .json({ error: { code: 'VALIDATION', message: 'status must be NEW, READ or ARCHIVED' } });
      return;
    }
    const message = await prisma.message.update({
      where: { id: req.params.id },
      data: { status },
      select: { id: true, status: true },
    });
    if (!message) throw notFound('Message not found');
    res.json({ message });
  }),
);

export default router;

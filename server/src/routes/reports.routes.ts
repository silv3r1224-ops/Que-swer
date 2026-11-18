import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { forbidden, notFound } from '../lib/AppError.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { parsePagination, buildPageMeta } from '../utils/pagination.js';

const router = Router();

const createReportSchema = z.object({
  itemType: z.enum(['QUESTION', 'ANSWER', 'COMMENT', 'USER']),
  itemId: z.string().min(1),
  reason: z.string().min(5).max(2_000),
});

const reviewSchema = z.object({
  status: z.enum(['REVIEWED', 'DISMISSED', 'ACTIONED']),
  reviewNote: z.string().max(2_000).optional(),
});

router.post(
  '/',
  requireAuth,
  writeLimiter,
  validate({ body: createReportSchema }),
  asyncHandler(async (req, res) => {
    const { itemType, itemId, reason } = req.body;

    // Ensure the reported item exists.
    const exists =
      itemType === 'QUESTION'
        ? await prisma.question.findUnique({ where: { id: itemId } })
        : itemType === 'ANSWER'
          ? await prisma.answer.findUnique({ where: { id: itemId } })
          : itemType === 'COMMENT'
            ? await prisma.comment.findUnique({ where: { id: itemId } })
            : await prisma.user.findUnique({ where: { id: itemId } });
    if (!exists) throw notFound('Reported item not found');

    const report = await prisma.report.create({
      data: { reporterId: req.user!.id, itemType, itemId, reason },
      select: { id: true, createdAt: true },
    });
    res.status(201).json({ report });
  }),
);

// Moderator/admin: queue + review
router.get(
  '/',
  requireAuth,
  requireRole('MODERATOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, orderBy, skip, take } = parsePagination(req.query, [
      'createdAt',
      'status',
    ]);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const where = status ? { status: status as never } : {};
    const [total, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        select: {
          id: true,
          itemType: true,
          itemId: true,
          reason: true,
          status: true,
          createdAt: true,
          reporter: { select: { id: true, username: true } },
          reviewer: { select: { id: true, username: true } },
        },
        orderBy,
        skip,
        take,
      }),
    ]);
    res.json({ reports, meta: buildPageMeta(total, page, pageSize) });
  }),
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('MODERATOR', 'ADMIN'),
  validate({ body: reviewSchema }),
  asyncHandler(async (req, res) => {
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) throw notFound('Report not found');

    const { status, reviewNote } = req.body;
    const updated = await prisma.report.update({
      where: { id: report.id },
      data: { status, reviewNote, reviewedById: req.user!.id, resolvedAt: new Date() },
      select: { id: true, status: true },
    });
    res.json({ report: updated });
  }),
);

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { forbidden, notFound } from '../lib/AppError.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { parsePagination, buildPageMeta } from '../utils/pagination.js';

const router = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
});

// Public profile
router.get(
  '/:username',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        id: true,
        username: true,
        displayName: true,
        reputation: true,
        bio: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        _count: { select: { questions: true, answers: true } },
      },
    });
    if (!user) throw notFound('User not found');
    res.json({ user });
  }),
);

// Own profile update
router.patch(
  '/@me',
  requireAuth,
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: req.body,
      select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true },
    });
    res.json({ user });
  }),
);

// My bookmarks
router.get(
  '/@me/bookmarks',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { page, pageSize, orderBy, skip, take } = parsePagination(req.query);
    const [total, bookmarks] = await Promise.all([
      prisma.bookmark.count({ where: { userId: req.user!.id } }),
      prisma.bookmark.findMany({
        where: { userId: req.user!.id },
        select: {
          id: true,
          createdAt: true,
          question: {
            select: {
              id: true,
              title: true,
              score: true,
              createdAt: true,
              tags: { select: { tag: { select: { slug: true, name: true } } } },
            },
          },
        },
        orderBy,
        skip,
        take,
      }),
    ]);
    res.json({
      bookmarks: bookmarks.map((b) => ({
        ...b,
        question: { ...b.question, tags: b.question.tags.map((t) => t.tag) },
      })),
      meta: buildPageMeta(total, page, pageSize),
    });
  }),
);

// Toggle bookmark on a question
router.post(
  '/@me/bookmarks/:questionId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const questionId = req.params.questionId;
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    });
    if (!question) throw notFound('Question not found');

    const existing = await prisma.bookmark.findUnique({
      where: { userId_questionId: { userId: req.user!.id, questionId } },
    });
    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
      res.json({ bookmarked: false });
    } else {
      await prisma.bookmark.create({ data: { userId: req.user!.id, questionId } });
      res.json({ bookmarked: true });
    }
  }),
);

// My activity (questions + answers)
router.get(
  '/@me/activity',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [questions, answers] = await Promise.all([
      prisma.question.findMany({
        where: { authorId: req.user!.id },
        select: { id: true, title: true, createdAt: true, score: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.answer.findMany({
        where: { authorId: req.user!.id },
        select: {
          id: true,
          createdAt: true,
          score: true,
          isAccepted: true,
          question: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    res.json({ questions, answers });
  }),
);

/**
 * Moderator/admin: list users, ban/unban, change roles.
 */
router.get(
  '/admin/users',
  requireAuth,
  requireRole('MODERATOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, orderBy, skip, take } = parsePagination(req.query, [
      'createdAt',
      'reputation',
    ]);
    const [total, users] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          role: true,
          isBanned: true,
          reputation: true,
          createdAt: true,
        },
        orderBy,
        skip,
        take,
      }),
    ]);
    res.json({ users, meta: buildPageMeta(total, page, pageSize) });
  }),
);

const adminPatchSchema = z.object({
  role: z.enum(['STUDENT', 'MODERATOR', 'ADMIN']).optional(),
  isBanned: z.boolean().optional(),
});

router.patch(
  '/admin/users/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: adminPatchSchema }),
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw notFound('User not found');
    if (target.role === 'ADMIN' && req.body.role && req.body.role !== 'ADMIN') {
      throw forbidden('Cannot demote the last admin');
    }
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: req.body,
      select: { id: true, role: true, isBanned: true },
    });
    res.json({ user: updated });
  }),
);

export default router;

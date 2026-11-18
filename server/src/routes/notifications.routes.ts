import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { parsePagination, buildPageMeta } from '../utils/pagination.js';

const router = Router();
router.use(requireAuth);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: z.enum(['true', 'false']).default('false'),
});

router.get(
  '/',
  validate({ query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, pageSize, unreadOnly } = req.query as z.infer<typeof listQuerySchema> & {
      page: number;
      pageSize: number;
    };
    const where = { userId: req.user!.id, ...(unreadOnly === 'true' ? { readAt: null } : {}) };

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        select: {
          id: true,
          type: true,
          message: true,
          readAt: true,
          createdAt: true,
          actor: { select: { id: true, username: true, displayName: true } },
          question: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const unread = await prisma.notification.count({
      where: { userId: req.user!.id, readAt: null },
    });
    res.json({ notifications, unread, meta: buildPageMeta(total, page, pageSize) });
  }),
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  }),
);

router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!notification) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found' } });
      return;
    }
    await prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  }),
);

export default router;

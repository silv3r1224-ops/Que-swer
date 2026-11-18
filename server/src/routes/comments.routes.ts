import { Router } from 'express';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { forbidden, notFound } from '../lib/AppError.js';
import { requireAuth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) throw notFound('Comment not found');
    const isMod = req.user!.role !== 'STUDENT';
    if (!isMod && comment.authorId !== req.user!.id) throw forbidden();

    await prisma.comment.delete({ where: { id } });
    res.status(204).end();
  }),
);

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { forbidden, notFound, badRequest } from '../lib/AppError.js';
import { requireAuth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { recalcQuestionScore } from './questions.routes.js';

const router = Router();

const voteSchema = z.object({
  direction: z.enum(['UP', 'DOWN']),
});

async function recalcAnswerScore(answerId: string) {
  const agg = await prisma.vote.groupBy({
    by: ['direction'],
    where: { itemType: 'ANSWER', itemId: answerId },
    _count: { direction: true },
  });
  const score = agg.reduce(
    (sum, row) => sum + (row.direction === 'UP' ? row._count.direction : -row._count.direction),
    0,
  );
  await prisma.answer.update({ where: { id: answerId }, data: { score } });
  return score;
}

async function ownerOf(itemType: 'QUESTION' | 'ANSWER', itemId: string): Promise<string | null> {
  if (itemType === 'QUESTION') {
    const q = await prisma.question.findUnique({
      where: { id: itemId },
      select: { authorId: true },
    });
    return q?.authorId ?? null;
  }
  const a = await prisma.answer.findUnique({ where: { id: itemId }, select: { authorId: true } });
  return a?.authorId ?? null;
}

router.post(
  '/:itemType/:itemId',
  requireAuth,
  writeLimiter,
  validate({ body: voteSchema }),
  asyncHandler(async (req, res) => {
    const itemType = req.params.itemType as 'QUESTION' | 'ANSWER';
    const { itemId } = req.params;
    const { direction } = req.body as z.infer<typeof voteSchema>;

    if (itemType !== 'QUESTION' && itemType !== 'ANSWER')
      throw badRequest('itemType must be QUESTION or ANSWER');

    const owner = await ownerOf(itemType, itemId);
    if (owner === null) throw notFound(`${itemType} not found`);
    if (owner === req.user!.id) throw forbidden('You cannot vote on your own content');

    const existing = await prisma.vote.findUnique({
      where: { userId_itemType_itemId: { userId: req.user!.id, itemType, itemId } },
    });

    if (existing) {
      if (existing.direction === direction) {
        // Toggle off: remove the vote entirely.
        await prisma.vote.delete({ where: { id: existing.id } });
      } else {
        await prisma.vote.update({ where: { id: existing.id }, data: { direction } });
      }
    } else {
      await prisma.vote.create({ data: { userId: req.user!.id, itemType, itemId, direction } });
    }

    const score =
      itemType === 'QUESTION' ? await recalcQuestionScore(itemId) : await recalcAnswerScore(itemId);
    res.json({ score, direction: existing?.direction === direction ? null : direction });
  }),
);

router.delete(
  '/:itemType/:itemId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const itemType = req.params.itemType as 'QUESTION' | 'ANSWER';
    const { itemId } = req.params;
    if (itemType !== 'QUESTION' && itemType !== 'ANSWER')
      throw badRequest('itemType must be QUESTION or ANSWER');

    const existing = await prisma.vote.findUnique({
      where: { userId_itemType_itemId: { userId: req.user!.id, itemType, itemId } },
    });
    if (existing) await prisma.vote.delete({ where: { id: existing.id } });

    const score =
      itemType === 'QUESTION' ? await recalcQuestionScore(itemId) : await recalcAnswerScore(itemId);
    res.json({ score, direction: null });
  }),
);

export default router;

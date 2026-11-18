import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError, forbidden, notFound } from '../lib/AppError.js';
import { requireAuth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const updateAnswerSchema = z.object({
  body: z.string().min(5).max(50_000),
});

const commentSchema = z.object({
  body: z.string().min(1).max(2_000),
});

async function getAnswerOr404(id: string) {
  const answer = await prisma.answer.findUnique({ where: { id } });
  if (!answer) throw notFound('Answer not found');
  return answer;
}

router.patch(
  '/:id',
  requireAuth,
  validate({ body: updateAnswerSchema }),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const answer = await getAnswerOr404(id);
    const isMod = req.user!.role !== 'STUDENT';
    if (!isMod && answer.authorId !== req.user!.id) throw forbidden();

    const updated = await prisma.answer.update({
      where: { id },
      data: { body: req.body.body },
      select: { id: true, updatedAt: true },
    });
    res.json({ answer: updated });
  }),
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const answer = await getAnswerOr404(id);
    const isMod = req.user!.role !== 'STUDENT';
    if (!isMod && answer.authorId !== req.user!.id) throw forbidden();

    await prisma.answer.delete({ where: { id } });
    res.status(204).end();
  }),
);

/**
 * Accept an answer (marks it accepted, un-accepts the previous one).
 * Only the question author or a moderator can do this.
 */
router.post(
  '/:id/accept',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const answer = await getAnswerOr404(id);

    const question = await prisma.question.findUnique({ where: { id: answer.questionId } });
    if (!question) throw notFound('Question not found');
    const isMod = req.user!.role !== 'STUDENT';
    if (!isMod && question.authorId !== req.user!.id) throw forbidden();

    const isUnaccepting = answer.isAccepted;

    await prisma.$transaction([
      prisma.answer.updateMany({ where: { questionId: question.id }, data: { isAccepted: false } }),
      prisma.answer.update({ where: { id }, data: { isAccepted: !isUnaccepting } }),
    ]);

    if (!isUnaccepting && answer.authorId !== req.user!.id) {
      await prisma.notification.create({
        data: {
          userId: answer.authorId,
          type: 'ANSWER_ACCEPTED',
          actorId: req.user!.id,
          questionId: question.id,
          answerId: id,
          message: 'Your answer was accepted',
        },
      });
    }

    res.json({ accepted: !isUnaccepting });
  }),
);

// Comments on answers
router.post(
  '/:id/comments',
  requireAuth,
  writeLimiter,
  validate({ body: commentSchema }),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    await getAnswerOr404(id);
    const comment = await prisma.comment.create({
      data: { answerId: id, authorId: req.user!.id, body: req.body.body },
      select: { id: true, createdAt: true },
    });
    res.status(201).json({ comment });
  }),
);

router.get(
  '/:id/comments',
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    await getAnswerOr404(id);
    const comments = await prisma.comment.findMany({
      where: { answerId: id },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ comments });
  }),
);

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError, forbidden, notFound } from '../lib/AppError.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { parsePagination, buildPageMeta } from '../utils/pagination.js';

const router = Router({ mergeParams: true });

const tagSchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9-]+$/, 'Tags use lowercase letters, numbers and dashes');

const createQuestionSchema = z.object({
  title: z.string().min(10).max(200),
  body: z.string().min(5).max(50_000),
  departmentId: z.string().cuid().optional(),
  courseId: z.string().cuid().optional(),
  tags: z.array(tagSchema).max(8).default([]),
});

const updateQuestionSchema = createQuestionSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['new', 'top', 'unanswered', 'old']).default('new'),
  departmentId: z.string().cuid().optional(),
  courseId: z.string().cuid().optional(),
  tag: z.string().optional(),
  status: z.enum(['OPEN', 'CLOSED', 'HIDDEN']).optional(),
});

const answerSchema = z.object({
  body: z.string().min(5).max(50_000),
});

const answerListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['new', 'top', 'old']).default('new'),
});

function sortToOrderBy(sort: string) {
  switch (sort) {
    case 'top':
      return { score: 'desc' as const, createdAt: 'desc' as const };
    case 'old':
      return { createdAt: 'asc' as const };
    case 'unanswered':
      return { createdAt: 'desc' as const };
    default:
      return { createdAt: 'desc' as const };
  }
}

/** Recomputes a question's score from its votes (kept in sync on vote changes). */
export async function recalcQuestionScore(questionId: string) {
  const agg = await prisma.vote.groupBy({
    by: ['direction'],
    where: { itemType: 'QUESTION', itemId: questionId },
    _count: { direction: true },
  });
  const score = agg.reduce(
    (sum, row) => sum + (row.direction === 'UP' ? row._count.direction : -row._count.direction),
    0,
  );
  await prisma.question.update({ where: { id: questionId }, data: { score } });
  return score;
}

async function upsertTags(tags: string[]) {
  const slugs = [...new Set(tags)];
  const existing = await prisma.tag.findMany({ where: { slug: { in: slugs } } });
  const existingSlugs = new Set(existing.map((t) => t.slug));
  const missing = slugs.filter((s) => !existingSlugs.has(s));

  if (missing.length) {
    await prisma.tag.createMany({
      data: missing.map((slug) => ({ slug, name: slug })),
      skipDuplicates: true,
    });
  }
  await prisma.tag.updateMany({
    where: { slug: { in: slugs } },
    data: { usageCount: { increment: 1 } },
  });
  return slugs;
}

// ------------------------------------------------------------------
// List / create
// ------------------------------------------------------------------

router.get(
  '/',
  optionalAuth,
  validate({ query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, pageSize, sort, departmentId, courseId, tag, status } = req.query as z.infer<
      typeof listQuerySchema
    > & { page: number; pageSize: number };

    const where: Record<string, unknown> = {
      status: status ?? undefined,
      departmentId: departmentId ?? undefined,
      courseId: courseId ?? undefined,
      ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
      ...(sort === 'unanswered' ? { answers: { none: {} } } : {}),
    };

    const [total, questions] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.findMany({
        where,
        select: {
          id: true,
          title: true,
          body: true,
          score: true,
          views: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          department: { select: { id: true, name: true, slug: true } },
          course: { select: { id: true, code: true, name: true } },
          tags: { select: { tag: { select: { slug: true, name: true } } } },
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              reputation: true,
              avatarUrl: true,
            },
          },
          _count: { select: { answers: true, comments: true } },
        },
        orderBy: sortToOrderBy(sort),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({
      questions: questions.map((q) => ({ ...q, tags: q.tags.map((t) => t.tag) })),
      meta: buildPageMeta(total, page, pageSize),
    });
  }),
);

router.post(
  '/',
  requireAuth,
  writeLimiter,
  validate({ body: createQuestionSchema }),
  asyncHandler(async (req, res) => {
    const { title, body, departmentId, courseId, tags } = req.body;

    if (departmentId || courseId) {
      const dept = await prisma.department.findFirst({ where: { id: departmentId ?? '' } });
      if (!dept && departmentId) throw notFound('Department not found');
      if (courseId) {
        const course = await prisma.course.findFirst({ where: { id: courseId } });
        if (!course) throw notFound('Course not found');
        if (departmentId && course.departmentId !== departmentId) {
          throw new AppError('Course does not belong to that department', { statusCode: 400 });
        }
      }
    }

    const tagSlugs = await upsertTags(tags);

    const question = await prisma.question.create({
      data: {
        title,
        body,
        departmentId: departmentId ?? null,
        courseId: courseId ?? null,
        authorId: req.user!.id,
        tags: {
          create: tagSlugs.map((slug) => ({ tag: { connect: { slug } } })),
        },
      },
      select: { id: true, createdAt: true },
    });

    res.status(201).json({ question });
  }),
);

// ------------------------------------------------------------------
// Detail / update / delete
// ------------------------------------------------------------------

router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const userId = req.user?.id;

    const question = await prisma.question.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        body: true,
        score: true,
        views: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        department: { select: { id: true, name: true, slug: true } },
        course: { select: { id: true, code: true, name: true } },
        tags: { select: { tag: { select: { slug: true, name: true } } } },
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            reputation: true,
            avatarUrl: true,
          },
        },
        _count: { select: { answers: true, comments: true } },
        ...(userId
          ? {
              bookmarks: { where: { userId }, select: { id: true }, take: 1 },
            }
          : {}),
      },
    });
    if (!question) throw notFound('Question not found');

    // Increment view count in the background (fire-and-forget, best effort).
    void prisma.question
      .update({ where: { id }, data: { views: { increment: 1 } } })
      .catch(() => undefined);

    const { bookmarks, ...rest } = question as typeof question & { bookmarks?: { id: string }[] };

    // Votes are polymorphic (no FK relation), so fetch the current user's vote separately.
    const myVote = userId
      ? await prisma.vote.findUnique({
          where: { userId_itemType_itemId: { userId, itemType: 'QUESTION', itemId: id } },
          select: { direction: true },
        })
      : null;

    res.json({
      question: {
        ...rest,
        bookmarked: Boolean(bookmarks?.length),
        myVote: myVote?.direction ?? null,
      },
    });
  }),
);

router.patch(
  '/:id',
  requireAuth,
  validate({ body: updateQuestionSchema }),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const question = await prisma.question.findUnique({ where: { id } });
    if (!question) throw notFound('Question not found');
    const isMod = req.user!.role !== 'STUDENT';
    if (!isMod && question.authorId !== req.user!.id) throw forbidden();

    const { tags, ...data } = req.body;
    const patch: Record<string, unknown> = { ...data };
    if (tags !== undefined) {
      const tagSlugs = await upsertTags(tags);
      await prisma.questionTag.deleteMany({ where: { questionId: id } });
      patch.tags = { create: tagSlugs.map((slug) => ({ tag: { connect: { slug } } })) };
    }

    const updated = await prisma.question.update({
      where: { id },
      data: patch,
      select: { id: true },
    });
    res.json({ question: updated });
  }),
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const question = await prisma.question.findUnique({ where: { id } });
    if (!question) throw notFound('Question not found');
    const isMod = req.user!.role !== 'STUDENT';
    if (!isMod && question.authorId !== req.user!.id) throw forbidden();

    await prisma.question.delete({ where: { id } });
    res.status(204).end();
  }),
);

// ------------------------------------------------------------------
// Answers (sub-resource)
// ------------------------------------------------------------------

router.get(
  '/:id/answers',
  optionalAuth,
  validate({ query: answerListSchema }),
  asyncHandler(async (req, res) => {
    const questionId = req.params.id;
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    });
    if (!question) throw notFound('Question not found');

    const { page, pageSize, sort } = req.query as z.infer<typeof answerListSchema> & {
      page: number;
      pageSize: number;
    };
    const orderBy =
      sort === 'top'
        ? { score: 'desc' as const }
        : sort === 'old'
          ? { createdAt: 'asc' as const }
          : { createdAt: 'desc' as const };

    const [total, answers] = await Promise.all([
      prisma.answer.count({ where: { questionId } }),
      prisma.answer.findMany({
        where: { questionId },
        select: {
          id: true,
          body: true,
          isAccepted: true,
          score: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              reputation: true,
              avatarUrl: true,
            },
          },
          _count: { select: { comments: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({ answers, meta: buildPageMeta(total, page, pageSize) });
  }),
);

router.post(
  '/:id/answers',
  requireAuth,
  writeLimiter,
  validate({ body: answerSchema }),
  asyncHandler(async (req, res) => {
    const questionId = req.params.id;
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw notFound('Question not found');
    if (question.status === 'CLOSED')
      throw new AppError('This question is closed to new answers', { statusCode: 409 });

    const answer = await prisma.answer.create({
      data: { questionId, authorId: req.user!.id, body: req.body.body },
      select: { id: true, createdAt: true },
    });

    // Notify the question author (unless they answered their own question).
    if (question.authorId !== req.user!.id) {
      await prisma.notification.create({
        data: {
          userId: question.authorId,
          type: 'ANSWER_RECEIVED',
          actorId: req.user!.id,
          questionId,
          answerId: answer.id,
          message: 'Someone answered your question',
        },
      });
    }

    res.status(201).json({ answer });
  }),
);

export default router;

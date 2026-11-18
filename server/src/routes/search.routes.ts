import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { buildPageMeta } from '../utils/pagination.js';

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(['all', 'questions', 'papers', 'users']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

/**
 * Full-text search using Postgres tsvector + GIN (created in the migration).
 * Ranking via ts_rank; highlighting via ts_headline.
 */
router.get(
  '/',
  validate({ query: searchQuerySchema }),
  asyncHandler(async (req, res) => {
    const { q, type, page, pageSize } = req.query as z.infer<typeof searchQuerySchema> & {
      page: number;
      pageSize: number;
    };
    const query = q.trim();
    const tsQuery = query.replace(/['\\]/g, ''); // sanitize against tsquery operators
    const searchQuery = `${tsQuery}:*`; // prefix matching

    const questionsQuery = prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT q.id,
           q.title,
           q.body,
           q.score,
           q."createdAt" AS "createdAt",
           ts_rank(q.search_vector, to_tsquery('english', ${searchQuery})) AS rank,
           ts_headline('english', q.title || ' — ' || q.body, to_tsquery('english', ${searchQuery}),
             'StartSel=<mark>, StopSel=</mark>, MaxWords=40, MinWords=15') AS snippet
    FROM "Question" q
    WHERE q.search_vector @@ to_tsquery('english', ${searchQuery})
    ORDER BY rank DESC
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `;

    const papersQuery = prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT p.id,
           p.title,
           p.year,
           p.semester,
           d.name AS department,
           c.name AS course,
           ts_rank(p.search_vector, to_tsquery('english', ${searchQuery})) AS rank,
           ts_headline('english', p.title, to_tsquery('english', ${searchQuery}),
             'StartSel=<mark>, StopSel=</mark>') AS snippet
    FROM "Paper" p
    LEFT JOIN "Department" d ON d.id = p."departmentId"
    LEFT JOIN "Course" c ON c.id = p."courseId"
    WHERE p.search_vector @@ to_tsquery('english', ${searchQuery})
    ORDER BY rank DESC
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `;

    const usersQuery = prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT u.id, u.username, u."displayName" AS "displayName", u.reputation
    FROM "User" u
    WHERE u.username ILIKE ${`%${tsQuery}%`} OR u."displayName" ILIKE ${`%${tsQuery}%`}
    ORDER BY u.reputation DESC
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `;

    const [questions, papers, users] = await Promise.all([
      type === 'users' ? Promise.resolve([]) : questionsQuery,
      type === 'users' ? Promise.resolve([]) : papersQuery,
      type === 'questions' || type === 'papers' ? Promise.resolve([]) : usersQuery,
    ]);

    const questionsMeta =
      type === 'users'
        ? null
        : await prisma.question.count({
            where: {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { body: { contains: query, mode: 'insensitive' } },
              ],
            },
          });
    const papersMeta =
      type === 'users'
        ? null
        : await prisma.paper.count({
            where: { title: { contains: query, mode: 'insensitive' } },
          });

    res.json({
      query,
      questions: type === 'users' ? [] : questions,
      papers: type === 'users' ? [] : papers,
      users: type === 'questions' || type === 'papers' ? [] : users,
      meta: {
        questions: questionsMeta ? buildPageMeta(questionsMeta, page, pageSize) : null,
        papers: papersMeta ? buildPageMeta(papersMeta, page, pageSize) : null,
      },
    });
  }),
);

export default router;

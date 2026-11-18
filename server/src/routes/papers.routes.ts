import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import path from 'node:path';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { badRequest, notFound, forbidden } from '../lib/AppError.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { parsePagination, buildPageMeta } from '../utils/pagination.js';
import { deleteLocalFile, readLocalFile, saveLocalFile } from '../utils/storage.js';

const router = Router();

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 50 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(badRequest('Only JPG, PNG, WebP or PDF files are allowed'));
  },
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  departmentId: z.string().cuid().optional(),
  courseId: z.string().cuid().optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
  sort: z.enum(['new', 'old']).default('new'),
});

const createPaperSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1_000).optional(),
  departmentId: z.string().cuid(),
  courseId: z.string().cuid().optional().nullable(),
  year: z.coerce.number().int().min(1900).max(2100),
  semester: z.coerce.number().int().min(1).max(8),
  examType: z.string().max(40).optional(),
});

// ------------------------------------------------------------------
// Browse
// ------------------------------------------------------------------

router.get(
  '/',
  validate({ query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, pageSize, sort, departmentId, courseId, year, semester } = req.query as z.infer<
      typeof listQuerySchema
    > & { page: number; pageSize: number };

    const where = {
      departmentId: departmentId ?? undefined,
      courseId: courseId ?? undefined,
      year: year ?? undefined,
      semester: semester ?? undefined,
    };

    const [total, papers] = await Promise.all([
      prisma.paper.count({ where }),
      prisma.paper.findMany({
        where,
        select: {
          id: true,
          title: true,
          year: true,
          semester: true,
          examType: true,
          createdAt: true,
          department: { select: { id: true, name: true, slug: true } },
          course: { select: { id: true, code: true, name: true } },
          _count: { select: { pages: true } },
        },
        orderBy: sort === 'old' ? { year: 'asc' } : { year: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({ papers, meta: buildPageMeta(total, page, pageSize) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const paper = await prisma.paper.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        title: true,
        description: true,
        year: true,
        semester: true,
        examType: true,
        createdAt: true,
        department: { select: { id: true, name: true, slug: true } },
        course: { select: { id: true, code: true, name: true } },
        uploadedBy: { select: { id: true, username: true, displayName: true } },
        pages: {
          select: { id: true, pageNo: true, fileKey: true, mimeType: true, sizeBytes: true },
          orderBy: { pageNo: 'asc' },
        },
      },
    });
    if (!paper) throw notFound('Paper not found');
    res.json({ paper });
  }),
);

router.get(
  '/:id/files/:pageNo',
  asyncHandler(async (req, res) => {
    const pageNo = Number(req.params.pageNo);
    const page = await prisma.paperPage.findFirst({
      where: { paperId: req.params.id, pageNo },
    });
    if (!page) throw notFound('Page not found');

    const buffer = await readLocalFile(page.fileKey);
    res.setHeader('Content-Type', page.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.send(buffer);
  }),
);

// ------------------------------------------------------------------
// Upload (moderator/admin)
// ------------------------------------------------------------------

router.post(
  '/',
  requireAuth,
  requireRole('MODERATOR', 'ADMIN'),
  upload.array('pages', 50),
  validate({ body: createPaperSchema }),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) throw badRequest('At least one paper page image/PDF is required');

    const { title, description, departmentId, courseId, year, semester, examType } =
      req.body as z.infer<typeof createPaperSchema>;

    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) throw badRequest('Department not found');
    if (courseId) {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course || course.departmentId !== departmentId)
        throw badRequest('Invalid course for this department');
    }

    const paper = await prisma.paper.create({
      data: {
        title,
        description: description ?? null,
        departmentId,
        courseId: courseId ?? null,
        year,
        semester,
        examType: examType ?? null,
        uploadedById: req.user!.id,
      },
    });

    const pages = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const ext =
        path.extname(file.originalname).toLowerCase() ||
        (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
      const key = `${paper.id}/page-${i + 1}${ext}`;
      await saveLocalFile(key, file.buffer);
      pages.push({
        paperId: paper.id,
        pageNo: i + 1,
        fileKey: key,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      });
    }

    await prisma.paperPage.createMany({ data: pages });
    res.status(201).json({ paper: { id: paper.id, pageCount: pages.length } });
  }),
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('MODERATOR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const paper = await prisma.paper.findUnique({
      where: { id: req.params.id },
      include: { pages: { select: { fileKey: true } } },
    });
    if (!paper) throw notFound('Paper not found');

    // Prevent deleting a paper that is referenced by questions? Papers are not
    // referenced by questions — safe to delete.
    await prisma.paper.delete({ where: { id: paper.id } });
    await Promise.all(paper.pages.map((p) => deleteLocalFile(p.fileKey)));
    res.status(204).end();
  }),
);

export default router;

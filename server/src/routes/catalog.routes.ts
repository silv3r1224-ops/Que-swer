import { Router } from 'express';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/AppError.js';

const router = Router();

// Departments with course + paper counts
router.get(
  '/departments',
  asyncHandler(async (_req, res) => {
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        icon: true,
        _count: { select: { courses: true, papers: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ departments });
  }),
);

router.get(
  '/departments/:slug',
  asyncHandler(async (req, res) => {
    const dept = await prisma.department.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        icon: true,
        courses: {
          select: { id: true, code: true, name: true, _count: { select: { papers: true } } },
          orderBy: { code: 'asc' },
        },
      },
    });
    if (!dept) throw notFound('Department not found');
    res.json({ department: dept });
  }),
);

// Courses for a department (for filters / paper upload)
router.get(
  '/courses',
  asyncHandler(async (req, res) => {
    const departmentId =
      typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined;
    const courses = await prisma.course.findMany({
      where: departmentId ? { departmentId } : undefined,
      select: { id: true, code: true, name: true, departmentId: true },
      orderBy: { name: 'asc' },
      take: 200,
    });
    res.json({ courses });
  }),
);

// Popular tags (with usage counts)
router.get(
  '/tags',
  asyncHandler(async (req, res) => {
    const tags = await prisma.tag.findMany({
      select: { slug: true, name: true, usageCount: true },
      orderBy: { usageCount: 'desc' },
      take: 50,
    });
    res.json({ tags });
  }),
);

export default router;

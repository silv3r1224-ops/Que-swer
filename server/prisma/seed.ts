/**
 * Development seed: creates the first admin, a moderator, departments,
 * courses, tags, a few Q&A threads with votes/comments, and sample papers
 * (metadata only — pages ship via `import-papers.ts`).
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  // --- Users -------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: 'admin@que-swer.app' },
    update: {},
    create: {
      email: 'admin@que-swer.app',
      username: 'admin',
      displayName: 'Admin',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const mod = await prisma.user.upsert({
    where: { email: 'mod@que-swer.app' },
    update: {},
    create: {
      email: 'mod@que-swer.app',
      username: 'moderator',
      displayName: 'Moderator',
      passwordHash,
      role: 'MODERATOR',
    },
  });

  // --- Departments & courses --------------------------------------------
  const science = await prisma.department.upsert({
    where: { slug: 'science' },
    update: {},
    create: {
      slug: 'science',
      name: 'Science',
      description: 'B.Sc. programmes and courses',
      icon: 'flask',
    },
  });
  const arts = await prisma.department.upsert({
    where: { slug: 'arts' },
    update: {},
    create: {
      slug: 'arts',
      name: 'Arts',
      description: 'B.A. programmes and courses',
      icon: 'book',
    },
  });
  const commerce = await prisma.department.upsert({
    where: { slug: 'commerce' },
    update: {},
    create: {
      slug: 'commerce',
      name: 'Commerce',
      description: 'B.Com. programmes and courses',
      icon: 'briefcase',
    },
  });

  const courseRows: Array<{ code: string; name: string; departmentId: string }> = [
    { code: 'BSC-PHY', name: 'Physics', departmentId: science.id },
    { code: 'BSC-CHEM', name: 'Chemistry', departmentId: science.id },
    { code: 'BSC-MATH', name: 'Mathematics', departmentId: science.id },
    { code: 'BSC-CS', name: 'Computer Science', departmentId: science.id },
    { code: 'BA-ENG', name: 'English', departmentId: arts.id },
    { code: 'BA-HIST', name: 'History', departmentId: arts.id },
    { code: 'BCOM-ACC', name: 'Accountancy', departmentId: commerce.id },
  ];
  const courseIds = new Map<string, string>();
  for (const row of courseRows) {
    const course = await prisma.course.upsert({
      where: { departmentId_code: { departmentId: row.departmentId, code: row.code } },
      update: {},
      create: row,
    });
    courseIds.set(row.code, course.id);
  }

  // --- Tags --------------------------------------------------------------
  const tagSlugs = [
    'physics',
    'chemistry',
    'mathematics',
    'computer-science',
    'semester-exams',
    'preparation',
    'syllabus',
  ];
  for (const slug of tagSlugs) {
    await prisma.tag.upsert({
      where: { slug },
      update: {},
      create: { slug, name: slug.replace(/-/g, ' ') },
    });
  }
  const tags = await prisma.tag.findMany({ where: { slug: { in: tagSlugs } } });
  const tagBySlug = new Map(tags.map((t) => [t.slug, t.id]));

  // --- Sample questions ---------------------------------------------------
  const q1 = await prisma.question.upsert({
    where: { id: 'seed-question-1' },
    update: {},
    create: {
      id: 'seed-question-1',
      title: 'Where can I find NEHU previous year question papers for B.Sc?',
      body: 'I am preparing for Semester 3 exams. Are the 2024 papers available somewhere on this platform?',
      authorId: admin.id,
      departmentId: science.id,
      courseId: courseIds.get('BSC-CS'),
      score: 12,
      views: 240,
      tags: {
        create: [
          { tagId: tagBySlug.get('computer-science')! },
          { tagId: tagBySlug.get('preparation')! },
        ],
      },
    },
  });

  const a1 = await prisma.answer.upsert({
    where: { id: 'seed-answer-1' },
    update: {},
    create: {
      id: 'seed-answer-1',
      questionId: q1.id,
      authorId: mod.id,
      body: 'Yes — open the Science department and choose Computer Science, then filter by 2024, Semester 3. Downloads are per page for now.',
      score: 8,
      isAccepted: true,
    },
  });

  await prisma.vote.createMany({
    data: [
      { userId: mod.id, itemType: 'QUESTION', itemId: q1.id, direction: 'UP' },
      { userId: admin.id, itemType: 'ANSWER', itemId: a1.id, direction: 'UP' },
    ],
    skipDuplicates: true,
  });

  await prisma.comment.upsert({
    where: { id: 'seed-comment-1' },
    update: {},
    create: {
      id: 'seed-comment-1',
      questionId: q1.id,
      authorId: mod.id,
      body: 'Also check the tag #preparation for more.',
    },
  });

  // --- Sample paper metadata (no files) ----------------------------------
  await prisma.paper.upsert({
    where: { id: 'seed-paper-1' },
    update: {},
    create: {
      id: 'seed-paper-1',
      title: 'Computer Science — Semester 3 (2024)',
      description: 'Imported sample; pages come from the import script.',
      departmentId: science.id,
      courseId: courseIds.get('BSC-CS'),
      year: 2024,
      semester: 3,
      uploadedById: mod.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete:', {
    admin: admin.username,
    moderator: mod.username,
    departments: 3,
    courses: courseRows.length,
    tags: tagSlugs.length,
  });
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

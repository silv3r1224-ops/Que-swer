/**
 * Importer for paper scans that live in the repo (legacy layout):
 *
 *   NEHU/NEP/sem{N}/{year}/BSC/{course}/{prefix}{pageNo}.jpg
 *
 * It creates (or reuses) departments/courses, creates Paper + PaperPage
 * rows, and copies files into storage. Idempotent: re-running only adds
 * pages/papers that are missing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { saveLocalFile } from '../src/utils/storage.js';

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../'); // repo root
const SCANS_ROOT = process.env.IMPORT_SCANS_ROOT ?? path.join(REPO_ROOT, 'NEHU');

interface ScanFile {
  abs: string;
  semester: number;
  year: number;
  courseFolder: string;
  prefix: string;
  pageNo: number;
  ext: string;
}

/**
 * Recursively discovers scan images. Semester and year are inferred from
 * directory names at any depth (`semN` for semester, 4-digit dir for year),
 * so both `NEHU/<year>/semN/...` and `NEHU/NEP/semN/<year>/...` layouts
 * (and deeper nests) work. The course folder is whatever lies below the
 * year directory (e.g. `BSC/chem`).
 */
function discoverScans(root: string): ScanFile[] {
  const out: ScanFile[] = [];
  if (!fs.existsSync(root)) return out;

  const walk = (
    dir: string,
    semester: number | null,
    year: number | null,
    yearSeen: boolean,
    courseFolder: string,
  ) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const semMatch = entry.name.match(/^sem(\d+)$/i);
        const yearMatch = entry.name.match(/^(\d{4})$/);
        const nextSem = semMatch ? Number(semMatch[1]) : semester;
        const nextYear = yearMatch ? Number(yearMatch[1]) : year;
        const nextYearSeen = yearSeen || Boolean(yearMatch);
        // Accumulate every directory except semester/year markers as course path.
        const nextCourseFolder =
          !semMatch && !yearMatch
            ? courseFolder
              ? `${courseFolder}/${entry.name}`
              : entry.name
            : courseFolder;
        walk(abs, nextSem, nextYear, nextYearSeen, nextCourseFolder);
      } else if (/\.(jpe?g|png|webp)$/i.test(entry.name)) {
        if (semester === null || year === null) continue;
        const match = entry.name.match(/^(.+?)(\d+)\.(jpe?g|png|webp)$/i);
        if (!match) continue;
        const prefix = match[1]!.toLowerCase();
        const pageNo = Number(match[2]);
        if (!Number.isInteger(pageNo) || pageNo < 1) continue;
        out.push({
          abs,
          semester,
          year,
          courseFolder: courseFolder || 'misc',
          prefix,
          pageNo,
          ext: match[3]!.toLowerCase(),
        });
      }
    }
  };

  walk(root, null, null, false, '');
  return out;
}

const COURSE_NAME_BY_FOLDER: Record<string, string> = {
  physics: 'Physics',
  chem: 'Chemistry',
  chemistry: 'Chemistry',
  maths: 'Mathematics',
  math: 'Mathematics',
  comp: 'Computer Science',
  cs: 'Computer Science',
  java: 'Computer Science',
  dld: 'Computer Science',
  iwa: 'Computer Science',
  cn: 'Computer Science',
  os: 'Computer Science',
  csa: 'Computer Science',
  english: 'English',
  hist: 'History',
  acc: 'Accountancy',
};

async function courseFor(departmentId: string, folder: string): Promise<{ id: string }> {
  const leaf = folder.split('/').pop() ?? folder;
  const name = COURSE_NAME_BY_FOLDER[leaf] ?? leaf;
  const code = `BSC-${name.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`;
  const existing = await prisma.course.findUnique({
    where: { departmentId_code: { departmentId, code } },
  });
  if (existing) return existing;
  return prisma.course.create({ data: { departmentId, code, name } });
}

async function main() {
  const scienceDept = await prisma.department.findUnique({ where: { slug: 'science' } });
  if (!scienceDept) throw new Error('Seed first: science department is missing');

  const scans = discoverScans(SCANS_ROOT);
  if (scans.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`No scans found under ${SCANS_ROOT} — nothing to import.`);
    return;
  }
  // eslint-disable-next-line no-console
  console.log(`Found ${scans.length} scan files.`);

  const byPaper = new Map<string, ScanFile[]>();
  for (const scan of scans) {
    const key = `${scan.year}|${scan.semester}|${scan.courseFolder}`;
    const list = byPaper.get(key) ?? [];
    list.push(scan);
    byPaper.set(key, list);
  }

  let papersCreated = 0;
  let pagesCreated = 0;

  for (const [key, files] of byPaper) {
    const [year, semester, courseFolder] = key.split('|') as [string, string, string];
    const course = await courseFor(scienceDept.id, courseFolder);
    const courseName = course.id
      ? (await prisma.course.findUnique({ where: { id: course.id } }))!.name
      : courseFolder;

    const title = `${courseName} — Semester ${semester} (${year})`;
    let paper = await prisma.paper.findFirst({
      where: {
        title,
        year: Number(year),
        semester: Number(semester),
        departmentId: scienceDept.id,
      },
    });
    if (!paper) {
      const moderator = await prisma.user.findFirst({ where: { role: 'MODERATOR' } });
      paper = await prisma.paper.create({
        data: {
          title,
          departmentId: scienceDept.id,
          courseId: course.id,
          year: Number(year),
          semester: Number(semester),
          uploadedById: moderator?.id ?? (await prisma.user.findFirst())!.id,
        },
      });
      papersCreated++;
    }

    const sorted = files.sort((a, b) => a.pageNo - b.pageNo);
    for (const file of sorted) {
      const exists = await prisma.paperPage.findFirst({
        where: { paperId: paper.id, pageNo: file.pageNo },
      });
      if (exists) continue;
      const buf = fs.readFileSync(file.abs);
      const key = `${paper.id}/page-${file.pageNo}.${file.ext}`;
      await saveLocalFile(key, buf);
      const mime =
        file.ext === 'png' ? 'image/png' : file.ext === 'webp' ? 'image/webp' : 'image/jpeg';
      await prisma.paperPage.create({
        data: {
          paperId: paper.id,
          pageNo: file.pageNo,
          fileKey: key,
          mimeType: mime,
          sizeBytes: buf.length,
        },
      });
      pagesCreated++;
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Import complete: ${papersCreated} papers, ${pagesCreated} pages created.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../src/app.js';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } },
});

export const app = createApp();

export const agent = request(app);

const MODELS = [
  'Vote',
  'Bookmark',
  'QuestionTag',
  'Tag',
  'Notification',
  'Report',
  'Comment',
  'Answer',
  'Question',
  'PaperPage',
  'Paper',
  'Course',
  'Department',
  'Message',
  'AuditLog',
  'RefreshToken',
  'User',
] as const;

export async function resetDb() {
  await prisma.$transaction(
    MODELS.map((model) =>
      prisma.$executeRawUnsafe(`TRUNCATE TABLE "${model}" RESTART IDENTITY CASCADE`),
    ),
  );
}

export async function createUser(
  overrides: Partial<{
    email: string;
    username: string;
    displayName: string;
    password: string;
    role: string;
  }> = {},
) {
  const password = overrides.password ?? 'Password123!';
  const res = await agent.post('/api/v1/auth/register').send({
    email: overrides.email ?? `user${Math.random().toString(36).slice(2, 8)}@test.dev`,
    username: overrides.username ?? `user${Math.random().toString(36).slice(2, 8)}`,
    displayName: overrides.displayName ?? 'Test User',
    password,
    ...(overrides.role ? { role: overrides.role } : {}),
  });
  return res;
}

export async function loginAs(email: string, password = 'Password123!') {
  const res = await agent.post('/api/v1/auth/login').send({ identifier: email, password });
  return res.body.accessToken as string;
}

export { prisma };

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false, // tests share the same database; run serially
    env: {
      NODE_ENV: 'test',
      // Tests run against a dedicated database (created by npm run db:test:create)
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://postgres:postgres@localhost:5432/que_swer_test?schema=public',
    },
  },
});

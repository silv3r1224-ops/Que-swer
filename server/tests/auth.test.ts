import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { agent, createUser, prisma, resetDb } from './helpers.js';

describe('auth', () => {
  beforeAll(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it('registers a user and returns tokens', async () => {
    const res = await createUser();
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.role).toBe('STUDENT');
    expect(res.headers['set-cookie']?.some((c: string) => c.includes('qs_refresh'))).toBe(true);
  });

  it('rejects duplicate email/username', async () => {
    await createUser({ email: 'dup@test.dev', username: 'dupuser' });
    const dupEmail = await createUser({ email: 'dup@test.dev', username: 'other1' });
    expect(dupEmail.status).toBe(409);

    const dupUsername = await createUser({ email: 'other@test.dev', username: 'dupuser' });
    expect(dupUsername.status).toBe(409);
  });

  it('validates password strength', async () => {
    const res = await agent.post('/api/v1/auth/register').send({
      email: 'weak@test.dev',
      username: 'weakuser',
      displayName: 'Weak',
      password: 'short',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });

  it('logs in with email and with username', async () => {
    await createUser({ email: 'login@test.dev', username: 'loginuser' });
    const emailLogin = await agent
      .post('/api/v1/auth/login')
      .send({ identifier: 'login@test.dev', password: 'Password123!' });
    expect(emailLogin.status).toBe(200);
    expect(emailLogin.body.accessToken).toBeTruthy();

    const userLogin = await agent
      .post('/api/v1/auth/login')
      .send({ identifier: 'loginuser', password: 'Password123!' });
    expect(userLogin.status).toBe(200);
  });

  it('rejects wrong password', async () => {
    await createUser({ email: 'wrong@test.dev', username: 'wronguser' });
    const res = await agent
      .post('/api/v1/auth/login')
      .send({ identifier: 'wrong@test.dev', password: 'nope-nope' });
    expect(res.status).toBe(401);
  });

  it('protects /me and bans are respected', async () => {
    const anon = await agent.get('/api/v1/auth/me');
    expect(anon.status).toBe(401);

    const user = await createUser({ email: 'me@test.dev', username: 'meuser' });
    const token = user.body.accessToken;
    const me = await agent.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe('meuser');

    await prisma.user.update({ where: { id: me.body.user.id }, data: { isBanned: true } });
    const banned = await agent.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(banned.status).toBe(401);
  });

  it('rotates refresh tokens and revokes on logout', async () => {
    const user = await createUser({ email: 'refresh@test.dev', username: 'refreshuser' });
    const cookie = user.headers['set-cookie']
      ?.find((c: string) => c.includes('qs_refresh'))
      ?.split(';')[0];
    expect(cookie).toBeTruthy();

    const refresh1 = await agent.post('/api/v1/auth/refresh').set('Cookie', cookie!);
    expect(refresh1.status).toBe(200);
    expect(refresh1.body.accessToken).toBeTruthy();

    // Old refresh token is now revoked (rotation) — using it again must fail.
    const replay = await agent.post('/api/v1/auth/refresh').set('Cookie', cookie!);
    expect(replay.status).toBe(401);

    // Logout clears the cookie.
    const logout = await agent
      .post('/api/v1/auth/logout')
      .set(
        'Cookie',
        refresh1.headers['set-cookie']
          ?.find((c: string) => c.includes('qs_refresh'))
          ?.split(';')[0] ?? '',
      );
    expect(logout.status).toBe(204);
  });
});

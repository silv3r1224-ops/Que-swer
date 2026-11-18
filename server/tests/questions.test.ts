import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { agent, createUser, loginAs, prisma, resetDb } from './helpers.js';

describe('questions & answers', () => {
  let token: string;
  let otherToken: string;
  let questionId: string;

  beforeAll(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDb();
    const primary = await createUser({ email: 'qa@test.dev', username: 'qauser' });
    const other = await createUser({ email: 'other@test.dev', username: 'otheruser' });
    token = primary.body.accessToken;
    otherToken = other.body.accessToken;
  });

  async function askQuestion() {
    const res = await agent
      .post('/api/v1/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'How does friction affect rolling motion?',
        body: 'I am studying mechanics and want a clear derivation.',
        tags: ['physics'],
      });
    expect(res.status).toBe(201);
    questionId = res.body.question.id;
    return questionId;
  }

  it('requires auth to ask', async () => {
    const res = await agent
      .post('/api/v1/questions')
      .send({ title: 'x'.repeat(20), body: 'y'.repeat(20) });
    expect(res.status).toBe(401);
  });

  it('creates, lists and browses a question', async () => {
    await askQuestion();

    const list = await agent
      .get('/api/v1/questions?sort=new')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.questions.length).toBe(1);
    expect(list.body.questions[0].tags[0].slug).toBe('physics');

    const detail = await agent
      .get(`/api/v1/questions/${questionId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.question.bookmarked).toBe(false);
    expect(detail.body.question.views).toBe(1);
  });

  it('answers, votes, accepts and comments', async () => {
    await askQuestion();

    // Answer
    const answer = await agent
      .post(`/api/v1/questions/${questionId}/answers`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ body: 'The key is static friction at the contact point...' });
    expect(answer.status).toBe(201);
    const answerId = answer.body.answer.id;

    // Vote on answer
    const vote = await agent
      .post(`/api/v1/votes/ANSWER/${answerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ direction: 'UP' });
    expect(vote.status).toBe(200);
    expect(vote.body.score).toBe(1);

    // Self-vote forbidden
    const selfVote = await agent
      .post(`/api/v1/votes/ANSWER/${answerId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ direction: 'UP' });
    expect(selfVote.status).toBe(403);

    // Accept answer (question author)
    const accept = await agent
      .post(`/api/v1/answers/${answerId}/accept`)
      .set('Authorization', `Bearer ${token}`);
    expect(accept.status).toBe(200);
    expect(accept.body.accepted).toBe(true);

    // Comment on answer
    const comment = await agent
      .post(`/api/v1/answers/${answerId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Thanks, this helped.' });
    expect(comment.status).toBe(201);

    // Answers list shows it
    const answers = await agent
      .get(`/api/v1/questions/${questionId}/answers?sort=top`)
      .set('Authorization', `Bearer ${token}`);
    expect(answers.status).toBe(200);
    expect(answers.body.answers.length).toBe(1);
    expect(answers.body.answers[0].isAccepted).toBe(true);
    expect(answers.body.answers[0].score).toBe(1);
  });

  it('validates input and 404s on missing questions', async () => {
    const res = await agent
      .post('/api/v1/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'short', body: 'x' });
    expect(res.status).toBe(400);

    const missing = await agent.get('/api/v1/questions/doesnotexist');
    expect(missing.status).toBe(404);
  });

  it('search endpoint returns matches', async () => {
    await askQuestion();
    const res = await agent.get('/api/v1/search?q=friction&type=questions');
    expect(res.status).toBe(200);
    expect(res.body.questions.length).toBeGreaterThan(0);
    expect(res.body.questions[0].id).toBe(questionId);
  });

  it('moderators can delete content', async () => {
    await askQuestion();
    const mod = await createUser({ email: 'mod@test.dev', username: 'moduser' });
    await prisma.user.update({ where: { id: mod.body.user.id }, data: { role: 'MODERATOR' } });
    const modToken = await loginAs('mod@test.dev');

    const del = await agent
      .delete(`/api/v1/questions/${questionId}`)
      .set('Authorization', `Bearer ${modToken}`);
    expect(del.status).toBe(204);

    const list = await agent.get('/api/v1/questions').set('Authorization', `Bearer ${token}`);
    expect(list.body.questions.length).toBe(0);
  });
});

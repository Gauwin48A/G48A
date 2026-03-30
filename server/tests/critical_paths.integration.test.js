const express = require('express');
const request = require('supertest');
const crypto = require('crypto');

function createCriticalPathApp() {
  const app = express();
  app.use(express.json());

  const users = new Map();
  const sessions = new Map();
  const posts = new Map();
  const payments = new Map();
  const chats = new Map();

  const createToken = () => crypto.randomBytes(16).toString('hex');

  const authGuard = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const userId = token ? sessions.get(token) : null;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = { id: userId, user_id: userId, userId };
    return next();
  };

  // Auth path
  app.post('/api/auth/signup', (req, res) => {
    const { fullName, email, password } = req.body || {};
    if (!fullName || !email || !password || String(password).length < 8) {
      return res.status(400).json({ error: 'Invalid signup payload' });
    }

    const userId = `u-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    users.set(userId, { id: userId, fullName, email, password });
    const token = createToken();
    sessions.set(token, userId);

    return res.status(201).json({
      success: true,
      token,
      user: { id: userId, fullName, email }
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    const user = Array.from(users.values()).find((candidate) => candidate.email === email);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createToken();
    sessions.set(token, user.id);
    return res.json({
      success: true,
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email }
    });
  });

  app.get('/api/auth/me', authGuard, (req, res) => {
    const user = users.get(req.user.id);
    return res.json({ id: user.id, fullName: user.fullName, email: user.email });
  });

  // Post path
  app.post('/api/posts', authGuard, (req, res) => {
    const { title, price } = req.body || {};
    if (!title || !Number.isFinite(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ error: 'Invalid post payload' });
    }

    const postId = `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const post = {
      post_id: postId,
      user_id: req.user.id,
      title: String(title),
      price: Number(price),
      status: 'active',
      created_at: new Date().toISOString()
    };
    posts.set(postId, post);
    return res.status(201).json({ post });
  });

  app.get('/api/posts', (req, res) => {
    const activePosts = Array.from(posts.values()).filter((post) => post.status === 'active');
    return res.json({ posts: activePosts, total: activePosts.length });
  });

  // Payment path
  app.post('/api/payments/submit', authGuard, (req, res) => {
    const { amount, transactionId } = req.body || {};
    const idempotencyKey = req.headers['x-idempotency-key'];

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || !transactionId) {
      return res.status(400).json({ error: 'Invalid payment payload' });
    }
    if (!idempotencyKey) {
      return res.status(400).json({ error: 'Idempotency key required' });
    }

    const existing = Array.from(payments.values()).find(
      (payment) => payment.idempotencyKey === idempotencyKey
    );
    if (existing) {
      return res.json({ payment: existing, idempotent: true });
    }

    const paymentId = `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const payment = {
      payment_id: paymentId,
      user_id: req.user.id,
      transaction_id: String(transactionId),
      amount: Number(amount),
      idempotencyKey: String(idempotencyKey),
      status: 'pending'
    };
    payments.set(paymentId, payment);
    return res.status(201).json({ payment });
  });

  app.post('/api/payments/webhook', (req, res) => {
    const { paymentId, status } = req.body || {};
    const payment = payments.get(String(paymentId || ''));
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    if (!['verified', 'failed'].includes(String(status || '').toLowerCase())) {
      return res.status(400).json({ error: 'Invalid webhook status' });
    }

    payment.status = String(status).toLowerCase();
    return res.json({ payment });
  });

  // Chat path
  app.post('/api/chat/threads', authGuard, (req, res) => {
    const { participantId } = req.body || {};
    if (!participantId) {
      return res.status(400).json({ error: 'participantId required' });
    }

    const threadId = `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const thread = {
      thread_id: threadId,
      members: [req.user.id, String(participantId)],
      messages: []
    };
    chats.set(threadId, thread);
    return res.status(201).json({ thread_id: threadId });
  });

  app.post('/api/chat/threads/:threadId/messages', authGuard, (req, res) => {
    const { threadId } = req.params;
    const { message } = req.body || {};
    const thread = chats.get(threadId);

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    if (!thread.members.includes(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const payload = {
      id: `m-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sender_id: req.user.id,
      message: String(message),
      created_at: new Date().toISOString()
    };
    thread.messages.push(payload);
    return res.status(201).json({ message: payload });
  });

  app.get('/api/chat/threads/:threadId/messages', authGuard, (req, res) => {
    const { threadId } = req.params;
    const thread = chats.get(threadId);

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    if (!thread.members.includes(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json({ messages: thread.messages });
  });

  return app;
}

describe('Critical Paths Integration', () => {
  const state = {};
  let app;

  beforeAll(() => {
    app = createCriticalPathApp();
  });

  test('auth: signup -> login -> me', async () => {
    const signup = await request(app).post('/api/auth/signup').send({
      fullName: 'Critical Path User',
      email: 'critical.path@example.com',
      password: 'StrongPass123!'
    });
    expect(signup.statusCode).toBe(201);
    expect(signup.body.token).toBeTruthy();

    const login = await request(app).post('/api/auth/login').send({
      email: 'critical.path@example.com',
      password: 'StrongPass123!'
    });
    expect(login.statusCode).toBe(200);
    state.token = login.body.token;
    expect(state.token).toBeTruthy();

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${state.token}`);
    expect(me.statusCode).toBe(200);
    expect(me.body.email).toBe('critical.path@example.com');
  });

  test('post: create -> list', async () => {
    const create = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${state.token}`)
      .send({ title: 'Integration Test Post', price: 999 });
    expect(create.statusCode).toBe(201);
    expect(create.body.post).toHaveProperty('post_id');

    const listing = await request(app).get('/api/posts');
    expect(listing.statusCode).toBe(200);
    expect(listing.body.total).toBeGreaterThan(0);
    state.postId = create.body.post.post_id;
  });

  test('payment: idempotent submit -> webhook verification', async () => {
    const idempotencyKey = 'cpay-key-1';
    const submit1 = await request(app)
      .post('/api/payments/submit')
      .set('Authorization', `Bearer ${state.token}`)
      .set('X-Idempotency-Key', idempotencyKey)
      .send({ transactionId: 'txn-12345', amount: 499 });
    expect(submit1.statusCode).toBe(201);
    expect(submit1.body.payment.status).toBe('pending');

    const submit2 = await request(app)
      .post('/api/payments/submit')
      .set('Authorization', `Bearer ${state.token}`)
      .set('X-Idempotency-Key', idempotencyKey)
      .send({ transactionId: 'txn-12345', amount: 499 });
    expect(submit2.statusCode).toBe(200);
    expect(submit2.body.idempotent).toBe(true);
    expect(submit2.body.payment.payment_id).toBe(submit1.body.payment.payment_id);

    const webhook = await request(app)
      .post('/api/payments/webhook')
      .send({ paymentId: submit1.body.payment.payment_id, status: 'verified' });
    expect(webhook.statusCode).toBe(200);
    expect(webhook.body.payment.status).toBe('verified');
  });

  test('chat: create thread -> send message -> fetch history', async () => {
    const threadRes = await request(app)
      .post('/api/chat/threads')
      .set('Authorization', `Bearer ${state.token}`)
      .send({ participantId: 'buyer-2' });
    expect(threadRes.statusCode).toBe(201);
    expect(threadRes.body.thread_id).toBeTruthy();
    state.threadId = threadRes.body.thread_id;

    const send = await request(app)
      .post(`/api/chat/threads/${state.threadId}/messages`)
      .set('Authorization', `Bearer ${state.token}`)
      .send({ message: 'Hello from integration test' });
    expect(send.statusCode).toBe(201);
    expect(send.body.message.message).toContain('integration test');

    const history = await request(app)
      .get(`/api/chat/threads/${state.threadId}/messages`)
      .set('Authorization', `Bearer ${state.token}`);
    expect(history.statusCode).toBe(200);
    expect(Array.isArray(history.body.messages)).toBe(true);
    expect(history.body.messages.length).toBe(1);
  });
});

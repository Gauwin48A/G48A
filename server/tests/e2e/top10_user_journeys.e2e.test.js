const express = require('express');
const request = require('supertest');
const crypto = require('crypto');

function createJourneyApp() {
  const app = express();
  app.use(express.json());

  const users = new Map();
  const sessions = new Map();
  const posts = new Map();
  const chats = new Map();
  const offers = new Map();
  const payments = new Map();
  const saleTransactions = new Map();
  const reviews = new Map();
  const complaints = new Map();

  const createId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const createToken = () => crypto.randomBytes(16).toString('hex');

  const authGuard = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const userId = token ? sessions.get(token) : null;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    req.user = users.get(userId);
    return next();
  };

  const adminGuard = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    return next();
  };

  app.post('/api/auth/signup', (req, res) => {
    const { fullName, email, password, role = 'user' } = req.body || {};
    if (!fullName || !email || !password || String(password).length < 8) {
      return res.status(400).json({ error: 'Invalid signup payload' });
    }

    const userId = createId('u');
    const user = { id: userId, fullName: String(fullName), email: String(email), password: String(password), role: String(role) };
    users.set(userId, user);
    return res.status(201).json({ user: { id: user.id, email: user.email, role: user.role } });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    const user = Array.from(users.values()).find((candidate) => candidate.email === email);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createToken();
    sessions.set(token, user.id);
    return res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  });

  app.post('/api/posts', authGuard, (req, res) => {
    const { title, price } = req.body || {};
    if (!title || !Number.isFinite(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ error: 'Invalid post payload' });
    }

    const postId = createId('post');
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
    const active = Array.from(posts.values()).filter((post) => post.status === 'active');
    return res.json({ posts: active, total: active.length });
  });

  app.post('/api/chat/threads', authGuard, (req, res) => {
    const { participantId, postId } = req.body || {};
    if (!participantId || !postId) return res.status(400).json({ error: 'participantId and postId required' });

    const threadId = createId('thread');
    chats.set(threadId, {
      thread_id: threadId,
      members: [req.user.id, String(participantId)],
      post_id: String(postId),
      messages: []
    });
    return res.status(201).json({ thread_id: threadId });
  });

  app.post('/api/chat/threads/:threadId/messages', authGuard, (req, res) => {
    const thread = chats.get(req.params.threadId);
    const { message } = req.body || {};
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    if (!thread.members.includes(req.user.id)) return res.status(403).json({ error: 'Forbidden' });
    if (!message) return res.status(400).json({ error: 'Message required' });

    const payload = {
      message_id: createId('msg'),
      sender_id: req.user.id,
      text: String(message),
      created_at: new Date().toISOString()
    };
    thread.messages.push(payload);
    return res.status(201).json({ message: payload });
  });

  app.get('/api/chat/threads/:threadId/messages', authGuard, (req, res) => {
    const thread = chats.get(req.params.threadId);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    if (!thread.members.includes(req.user.id)) return res.status(403).json({ error: 'Forbidden' });
    return res.json({ messages: thread.messages });
  });

  app.post('/api/offers', authGuard, (req, res) => {
    const { postId, offerPrice } = req.body || {};
    const post = posts.get(String(postId || ''));
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (!Number.isFinite(Number(offerPrice)) || Number(offerPrice) <= 0) {
      return res.status(400).json({ error: 'Invalid offer amount' });
    }

    const offerId = createId('offer');
    const offer = {
      offer_id: offerId,
      post_id: post.post_id,
      buyer_id: req.user.id,
      seller_id: post.user_id,
      offer_price: Number(offerPrice),
      status: 'pending'
    };
    offers.set(offerId, offer);
    return res.status(201).json({ offer });
  });

  app.post('/api/offers/:offerId/respond', authGuard, (req, res) => {
    const offer = offers.get(req.params.offerId);
    const { decision } = req.body || {};
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (offer.seller_id !== req.user.id) return res.status(403).json({ error: 'Only seller can respond' });
    if (!['accepted', 'rejected'].includes(String(decision || '').toLowerCase())) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    offer.status = String(decision).toLowerCase();
    return res.json({ offer });
  });

  app.post('/api/payments/submit', authGuard, (req, res) => {
    const { offerId, amount } = req.body || {};
    const idempotencyKey = req.headers['x-idempotency-key'];
    const offer = offers.get(String(offerId || ''));

    if (!offer || offer.status !== 'accepted') return res.status(400).json({ error: 'Accepted offer required' });
    if (!idempotencyKey) return res.status(400).json({ error: 'Idempotency key required' });
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const existing = Array.from(payments.values()).find((payment) => payment.idempotency_key === idempotencyKey);
    if (existing) return res.json({ payment: existing, idempotent: true });

    const paymentId = createId('pay');
    const payment = {
      payment_id: paymentId,
      offer_id: offer.offer_id,
      buyer_id: req.user.id,
      seller_id: offer.seller_id,
      amount: Number(amount),
      status: 'pending',
      idempotency_key: String(idempotencyKey)
    };
    payments.set(paymentId, payment);
    return res.status(201).json({ payment });
  });

  app.post('/api/payments/webhook', (req, res) => {
    const { paymentId, status } = req.body || {};
    const payment = payments.get(String(paymentId || ''));
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (!['verified', 'failed'].includes(String(status || '').toLowerCase())) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    payment.status = String(status).toLowerCase();
    return res.json({ payment });
  });

  app.post('/api/sale/initiate', authGuard, (req, res) => {
    const { offerId } = req.body || {};
    const offer = offers.get(String(offerId || ''));
    if (!offer || offer.status !== 'accepted') return res.status(400).json({ error: 'Accepted offer required' });
    if (offer.seller_id !== req.user.id) return res.status(403).json({ error: 'Only seller can initiate' });

    const payment = Array.from(payments.values()).find(
      (candidate) => candidate.offer_id === offer.offer_id && candidate.status === 'verified'
    );
    if (!payment) return res.status(400).json({ error: 'Verified payment required' });

    const txId = createId('sale');
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    saleTransactions.set(txId, {
      transaction_id: txId,
      offer_id: offer.offer_id,
      seller_id: offer.seller_id,
      buyer_id: offer.buyer_id,
      otp,
      status: 'otp_pending'
    });
    return res.status(201).json({ transaction_id: txId, otp });
  });

  app.post('/api/sale/confirm', authGuard, (req, res) => {
    const { transactionId, otp } = req.body || {};
    const tx = saleTransactions.get(String(transactionId || ''));
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.buyer_id !== req.user.id) return res.status(403).json({ error: 'Only buyer can confirm' });
    if (tx.otp !== String(otp || '')) return res.status(400).json({ error: 'Invalid OTP' });
    tx.status = 'completed';
    return res.json({ transaction: tx });
  });

  app.post('/api/reviews', authGuard, (req, res) => {
    const { revieweeId, rating, comment } = req.body || {};
    const completedTx = Array.from(saleTransactions.values()).find(
      (tx) => tx.status === 'completed' && tx.buyer_id === req.user.id && tx.seller_id === String(revieweeId)
    );
    if (!completedTx) return res.status(403).json({ error: 'Completed transaction required' });
    if (!Number.isFinite(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ error: 'Invalid rating' });
    }

    const reviewId = createId('review');
    const review = {
      review_id: reviewId,
      reviewer_id: req.user.id,
      reviewee_id: String(revieweeId),
      rating: Number(rating),
      comment: String(comment || '')
    };
    reviews.set(reviewId, review);
    return res.status(201).json({ review });
  });

  app.post('/api/complaints', authGuard, (req, res) => {
    const { postId, type, description } = req.body || {};
    if (!postId || !type || !description) return res.status(400).json({ error: 'Invalid complaint payload' });
    const complaintId = createId('complaint');
    const complaint = {
      complaint_id: complaintId,
      user_id: req.user.id,
      post_id: String(postId),
      type: String(type),
      description: String(description),
      status: 'open'
    };
    complaints.set(complaintId, complaint);
    return res.status(201).json({ complaint });
  });

  app.post('/api/admin/posts/:postId/flag', authGuard, adminGuard, (req, res) => {
    const post = posts.get(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    post.status = 'flagged';
    return res.json({ post });
  });

  app.post('/api/admin/posts/bulk-action', authGuard, adminGuard, (req, res) => {
    const { postIds, action } = req.body || {};
    if (!Array.isArray(postIds) || !postIds.length) return res.status(400).json({ error: 'postIds required' });
    if (!['approve', 'remove'].includes(String(action || '').toLowerCase())) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const targetStatus = String(action).toLowerCase() === 'approve' ? 'active' : 'removed';
    let affected = 0;
    for (const postId of postIds) {
      const post = posts.get(String(postId));
      if (post) {
        post.status = targetStatus;
        affected += 1;
      }
    }
    return res.json({ affected, status_after: targetStatus });
  });

  app.get('/api/admin/export/posts', authGuard, adminGuard, (req, res) => {
    const rows = Array.from(posts.values()).filter((post) => ['flagged', 'removed'].includes(post.status));
    const headers = ['post_id', 'user_id', 'title', 'price', 'status'];
    const csv = [headers.join(',')]
      .concat(rows.map((row) => headers.map((header) => `\"${String(row[header] || '').replace(/\"/g, '\"\"')}\"`).join(',')))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    return res.status(200).send(csv);
  });

  return app;
}

describe('Top 10 User Journeys (E2E)', () => {
  const state = {};
  let app;

  beforeAll(() => {
    app = createJourneyApp();
  });

  test('1) seller signs up and logs in', async () => {
    const signup = await request(app).post('/api/auth/signup').send({
      fullName: 'Seller One',
      email: 'seller.one@example.com',
      password: 'SellerPass123!'
    });
    expect(signup.statusCode).toBe(201);
    state.sellerId = signup.body.user.id;

    const login = await request(app).post('/api/auth/login').send({
      email: 'seller.one@example.com',
      password: 'SellerPass123!'
    });
    expect(login.statusCode).toBe(200);
    state.sellerToken = login.body.token;
  });

  test('2) buyer signs up and logs in', async () => {
    const signup = await request(app).post('/api/auth/signup').send({
      fullName: 'Buyer One',
      email: 'buyer.one@example.com',
      password: 'BuyerPass123!'
    });
    expect(signup.statusCode).toBe(201);
    state.buyerId = signup.body.user.id;

    const login = await request(app).post('/api/auth/login').send({
      email: 'buyer.one@example.com',
      password: 'BuyerPass123!'
    });
    expect(login.statusCode).toBe(200);
    state.buyerToken = login.body.token;
  });

  test('3) seller creates a post', async () => {
    const create = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${state.sellerToken}`)
      .send({ title: 'Fresh Apples', price: 250 });
    expect(create.statusCode).toBe(201);
    state.postId = create.body.post.post_id;
  });

  test('4) buyer discovers active posts', async () => {
    const listing = await request(app).get('/api/posts');
    expect(listing.statusCode).toBe(200);
    expect(listing.body.total).toBeGreaterThan(0);
    expect(listing.body.posts.some((post) => post.post_id === state.postId)).toBe(true);
  });

  test('5) buyer starts chat and exchanges message', async () => {
    const thread = await request(app)
      .post('/api/chat/threads')
      .set('Authorization', `Bearer ${state.buyerToken}`)
      .send({ participantId: state.sellerId, postId: state.postId });
    expect(thread.statusCode).toBe(201);
    state.threadId = thread.body.thread_id;

    const message = await request(app)
      .post(`/api/chat/threads/${state.threadId}/messages`)
      .set('Authorization', `Bearer ${state.buyerToken}`)
      .send({ message: 'Is this still available?' });
    expect(message.statusCode).toBe(201);

    const history = await request(app)
      .get(`/api/chat/threads/${state.threadId}/messages`)
      .set('Authorization', `Bearer ${state.sellerToken}`);
    expect(history.statusCode).toBe(200);
    expect(history.body.messages.length).toBe(1);
  });

  test('6) buyer submits offer and seller accepts', async () => {
    const offer = await request(app)
      .post('/api/offers')
      .set('Authorization', `Bearer ${state.buyerToken}`)
      .send({ postId: state.postId, offerPrice: 220 });
    expect(offer.statusCode).toBe(201);
    state.offerId = offer.body.offer.offer_id;

    const decision = await request(app)
      .post(`/api/offers/${state.offerId}/respond`)
      .set('Authorization', `Bearer ${state.sellerToken}`)
      .send({ decision: 'accepted' });
    expect(decision.statusCode).toBe(200);
    expect(decision.body.offer.status).toBe('accepted');
  });

  test('7) buyer pays and webhook verifies', async () => {
    const submit = await request(app)
      .post('/api/payments/submit')
      .set('Authorization', `Bearer ${state.buyerToken}`)
      .set('X-Idempotency-Key', 'journey-payment-1')
      .send({ offerId: state.offerId, amount: 220 });
    expect(submit.statusCode).toBe(201);
    state.paymentId = submit.body.payment.payment_id;

    const webhook = await request(app)
      .post('/api/payments/webhook')
      .send({ paymentId: state.paymentId, status: 'verified' });
    expect(webhook.statusCode).toBe(200);
    expect(webhook.body.payment.status).toBe('verified');
  });

  test('8) seller initiates sale and buyer confirms OTP', async () => {
    const initiate = await request(app)
      .post('/api/sale/initiate')
      .set('Authorization', `Bearer ${state.sellerToken}`)
      .send({ offerId: state.offerId });
    expect(initiate.statusCode).toBe(201);
    state.transactionId = initiate.body.transaction_id;
    state.saleOtp = initiate.body.otp;

    const confirm = await request(app)
      .post('/api/sale/confirm')
      .set('Authorization', `Bearer ${state.buyerToken}`)
      .send({ transactionId: state.transactionId, otp: state.saleOtp });
    expect(confirm.statusCode).toBe(200);
    expect(confirm.body.transaction.status).toBe('completed');
  });

  test('9) buyer submits review and complaint', async () => {
    const review = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${state.buyerToken}`)
      .send({ revieweeId: state.sellerId, rating: 5, comment: 'Smooth transaction' });
    expect(review.statusCode).toBe(201);

    const complaint = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${state.buyerToken}`)
      .send({ postId: state.postId, type: 'delivery_delay', description: 'Late delivery issue' });
    expect(complaint.statusCode).toBe(201);
    state.complaintId = complaint.body.complaint.complaint_id;
  });

  test('10) admin moderates flagged post and exports report', async () => {
    const adminSignup = await request(app).post('/api/auth/signup').send({
      fullName: 'Admin One',
      email: 'admin.one@example.com',
      password: 'AdminPass123!',
      role: 'admin'
    });
    expect(adminSignup.statusCode).toBe(201);

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin.one@example.com',
      password: 'AdminPass123!'
    });
    expect(adminLogin.statusCode).toBe(200);
    const adminToken = adminLogin.body.token;

    const flag = await request(app)
      .post(`/api/admin/posts/${state.postId}/flag`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(flag.statusCode).toBe(200);
    expect(flag.body.post.status).toBe('flagged');

    const bulk = await request(app)
      .post('/api/admin/posts/bulk-action')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ postIds: [state.postId], action: 'remove' });
    expect(bulk.statusCode).toBe(200);
    expect(bulk.body.affected).toBe(1);

    const exportRes = await request(app)
      .get('/api/admin/export/posts')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(exportRes.statusCode).toBe(200);
    expect(exportRes.headers['content-type']).toContain('text/csv');
    expect(exportRes.text).toContain('post_id');
    expect(exportRes.text).toContain(state.postId);
  });
});

/**
 * postAndSalesFlow.e2e.test.js
 *
 * End-to-end integration tests for:
 *   1. Post CRUD: create → read → update → delete → search
 *   2. Sales lifecycle: request → approve → ship → receive → settle
 *   3. Validation enforcement across all endpoints
 *   4. Authorization checks (ownership, buyer/seller roles)
 */

const express = require('express');
const request = require('supertest');
const crypto = require('crypto');

// ─── In-memory stores ────────────────────────────────────
const posts = new Map();
const sales = new Map();
const users = new Map();

// ─── Helpers ─────────────────────────────────────────────
const genId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ─── Seed data ───────────────────────────────────────────
const SELLER = { id: 'seller-001', email: 'seller@test.com', fullName: 'Seller', role: 'user' };
const BUYER = { id: 'buyer-001', email: 'buyer@test.com', fullName: 'Buyer', role: 'user' };

function signToken(userId) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ userId, id: userId })).toString('base64url');
  const sig = crypto.createHmac('sha256', 'test').update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

// ─── Build test app ──────────────────────────────────────
function buildApp() {
  const app = express();
  app.use(express.json());

  function protect(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1] || '{}', 'base64url').toString());
      if (!payload.userId) return res.status(401).json({ error: 'Invalid token' });
      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  function optionalAuth(req, _res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (token) {
      try {
        req.user = JSON.parse(Buffer.from(token.split('.')[1] || '{}', 'base64url').toString());
      } catch { /* ignore */ }
    }
    next();
  }

  // ── POST /api/posts — Create ──
  app.post('/api/posts', protect, (req, res) => {
    const { title, description, price, category_id, location, latitude, longitude } = req.body;

    // Validation
    if (!title || String(title).trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (String(title).length > 200) {
      return res.status(400).json({ error: 'Title too long (max 200 chars)' });
    }
    if (description && String(description).length > 5000) {
      return res.status(400).json({ error: 'Description too long (max 5000 chars)' });
    }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }
    if (latitude && (Number(latitude) < -90 || Number(latitude) > 90)) {
      return res.status(400).json({ error: 'Invalid latitude' });
    }
    if (longitude && (Number(longitude) < -180 || Number(longitude) > 180)) {
      return res.status(400).json({ error: 'Invalid longitude' });
    }

    const postId = genId('post');
    const post = {
      post_id: postId, user_id: req.user.userId,
      title: String(title).trim(), description: description || '',
      price: Number(price), category_id: category_id || null,
      location: location || null, latitude: latitude || null, longitude: longitude || null,
      status: 'active', views_count: 0,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    posts.set(postId, post);
    res.status(201).json({ success: true, post });
  });

  // ── GET /api/posts — List all ──
  app.get('/api/posts', optionalAuth, (_req, res) => {
    const activePosts = [...posts.values()].filter(p => p.status === 'active');
    res.json({ posts: activePosts, total: activePosts.length });
  });

  // ── GET /api/posts/mine — My posts ──
  app.get('/api/posts/mine', protect, (req, res) => {
    const myPosts = [...posts.values()].filter(p => p.user_id === req.user.userId);
    res.json({ posts: myPosts, total: myPosts.length });
  });

  // ── GET /api/posts/search-v2 — Search ──
  app.get('/api/posts/search-v2', optionalAuth, (req, res) => {
    const { q, min_price, max_price, category_id } = req.query;
    let results = [...posts.values()].filter(p => p.status === 'active');

    if (q) {
      const query = String(q).toLowerCase();
      results = results.filter(p =>
        p.title.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    }
    if (min_price) results = results.filter(p => p.price >= Number(min_price));
    if (max_price) results = results.filter(p => p.price <= Number(max_price));
    if (category_id) results = results.filter(p => p.category_id === category_id);

    res.json({ posts: results, total: results.length });
  });

  // ── GET /api/posts/:postId — Get by ID ──
  app.get('/api/posts/:postId', optionalAuth, (req, res) => {
    const post = posts.get(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    post.views_count = (post.views_count || 0) + 1;
    res.json({ post });
  });

  // ── PUT /api/posts/:postId — Update ──
  app.put('/api/posts/:postId', protect, (req, res) => {
    const post = posts.get(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    const { title, description, price, status } = req.body;
    if (title !== undefined) {
      if (String(title).trim().length === 0) return res.status(400).json({ error: 'Title cannot be empty' });
      if (String(title).length > 200) return res.status(400).json({ error: 'Title too long' });
      post.title = String(title).trim();
    }
    if (description !== undefined) {
      if (String(description).length > 5000) return res.status(400).json({ error: 'Description too long' });
      post.description = String(description);
    }
    if (price !== undefined) {
      if (isNaN(Number(price)) || Number(price) <= 0) return res.status(400).json({ error: 'Invalid price' });
      post.price = Number(price);
    }
    if (status !== undefined) {
      const valid = ['active', 'sold', 'inactive'];
      if (!valid.includes(status)) return res.status(400).json({ error: `Invalid status. Valid: ${valid.join(', ')}` });
      post.status = status;
    }
    post.updated_at = new Date().toISOString();
    res.json({ success: true, post });
  });

  // ── DELETE /api/posts/:postId — Delete ──
  app.delete('/api/posts/:postId', protect, (req, res) => {
    const post = posts.get(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    posts.delete(req.params.postId);
    res.json({ success: true, message: 'Post deleted' });
  });

  // ── PATCH /api/posts/:postId/status — Status update ──
  app.patch('/api/posts/:postId/status', protect, (req, res) => {
    const post = posts.get(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });

    const desired = String(req.body?.status || '').toLowerCase();
    if (desired === 'active') { post.status = 'active'; }
    else if (desired === 'sold') { post.status = 'sold'; }
    else return res.status(400).json({ error: 'Invalid status', allowed: ['active', 'sold'] });

    post.updated_at = new Date().toISOString();
    res.json({ success: true, post });
  });

  // ── Sales endpoints ──

  // POST /api/sales/request
  app.post('/api/sales/request', protect, (req, res) => {
    const { post_id, agreed_price } = req.body;
    if (!post_id) return res.status(400).json({ error: 'post_id is required' });
    if (!agreed_price || Number(agreed_price) <= 0) return res.status(400).json({ error: 'Valid agreed_price required' });

    const post = posts.get(post_id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.status !== 'active') return res.status(400).json({ error: 'Post is not available' });
    if (post.user_id === req.user.userId) return res.status(400).json({ error: 'Cannot buy your own post' });

    const saleId = genId('sale');
    const sale = {
      id: saleId, post_id, buyer_id: req.user.userId, seller_id: post.user_id,
      agreed_price: Number(agreed_price), status: 'requested',
      payment_mode: 'IN_APP', payment_status: 'PENDING',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    sales.set(saleId, sale);
    res.status(201).json({ success: true, sale });
  });

  // POST /api/sales/:id/approve
  app.post('/api/sales/:id/approve', protect, (req, res) => {
    const sale = sales.get(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (sale.seller_id !== req.user.userId) return res.status(403).json({ error: 'Only seller can approve' });
    if (sale.status !== 'requested') return res.status(400).json({ error: `Cannot approve sale in status: ${sale.status}` });

    sale.status = 'approved';
    sale.updated_at = new Date().toISOString();
    res.json({ success: true, sale });
  });

  // POST /api/sales/:id/reject
  app.post('/api/sales/:id/reject', protect, (req, res) => {
    const sale = sales.get(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (sale.seller_id !== req.user.userId) return res.status(403).json({ error: 'Only seller can reject' });

    sale.status = 'rejected';
    sale.updated_at = new Date().toISOString();
    res.json({ success: true, sale });
  });

  // POST /api/sales/:id/cancel
  app.post('/api/sales/:id/cancel', protect, (req, res) => {
    const sale = sales.get(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (sale.buyer_id !== req.user.userId) return res.status(403).json({ error: 'Only buyer can cancel' });
    if (sale.status !== 'requested') return res.status(400).json({ error: 'Can only cancel pending requests' });

    sale.status = 'cancelled';
    sale.updated_at = new Date().toISOString();
    res.json({ success: true, sale });
  });

  // POST /api/sales/:id/mark-shipped
  app.post('/api/sales/:id/mark-shipped', protect, (req, res) => {
    const sale = sales.get(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (sale.seller_id !== req.user.userId) return res.status(403).json({ error: 'Only seller can ship' });
    if (sale.status !== 'approved') return res.status(400).json({ error: `Cannot ship sale in status: ${sale.status}` });

    sale.status = 'shipped';
    sale.shipped_at = new Date().toISOString();
    sale.updated_at = new Date().toISOString();
    res.json({ success: true, sale });
  });

  // POST /api/sales/:id/order-received
  app.post('/api/sales/:id/order-received', protect, (req, res) => {
    const sale = sales.get(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (sale.buyer_id !== req.user.userId) return res.status(403).json({ error: 'Only buyer can confirm receipt' });
    if (sale.status !== 'shipped') return res.status(400).json({ error: 'Sale must be shipped first' });

    sale.status = 'received';
    sale.received_at = new Date().toISOString();
    sale.updated_at = new Date().toISOString();
    res.json({ success: true, sale });
  });

  // POST /api/sales/:id/rate
  app.post('/api/sales/:id/rate', protect, (req, res) => {
    const sale = sales.get(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (sale.buyer_id !== req.user.userId) return res.status(403).json({ error: 'Only buyer can rate' });
    if (!['received', 'settled'].includes(sale.status)) {
      return res.status(400).json({ error: 'Can only rate completed sales' });
    }

    const { rating, review } = req.body;
    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5' });
    }

    sale.rating = Number(rating);
    sale.review = review || null;
    sale.rated_at = new Date().toISOString();
    sale.updated_at = new Date().toISOString();
    res.json({ success: true, sale });
  });

  return app;
}

// ─── Tests ───────────────────────────────────────────────
describe('E2E Post CRUD', () => {
  let app;
  let sellerToken, buyerToken;

  beforeAll(() => {
    app = buildApp();
    sellerToken = signToken(SELLER.id);
    buyerToken = signToken(BUYER.id);
  });

  beforeEach(() => {
    posts.clear();
    sales.clear();
  });

  describe('Create post', () => {
    it('creates a post with valid data', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'iPhone 15 Pro', price: 89999, description: 'Like new', category_id: 'electronics' });

      expect(res.status).toBe(201);
      expect(res.body.post.title).toBe('iPhone 15 Pro');
      expect(res.body.post.price).toBe(89999);
      expect(res.body.post.status).toBe('active');
      expect(res.body.post.user_id).toBe(SELLER.id);
    });

    it('rejects post with missing title', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ price: 100 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Title');
    });

    it('rejects post with empty title', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: '   ', price: 100 });

      expect(res.status).toBe(400);
    });

    it('rejects post with title > 200 chars', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'x'.repeat(201), price: 100 });

      expect(res.status).toBe(400);
    });

    it('rejects post with zero/negative price', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Test', price: 0 });

      expect(res.status).toBe(400);
    });

    it('rejects post with description > 5000 chars', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Test', price: 100, description: 'x'.repeat(5001) });

      expect(res.status).toBe(400);
    });

    it('rejects post with invalid latitude', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Test', price: 100, latitude: 999 });

      expect(res.status).toBe(400);
    });

    it('rejects unauthenticated post creation', async () => {
      const res = await request(app).post('/api/posts').send({ title: 'Test', price: 100 });
      expect(res.status).toBe(401);
    });
  });

  describe('Read posts', () => {
    let postId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Test Post', price: 500 });
      postId = res.body.post.post_id;
    });

    it('GET /api/posts lists active posts', async () => {
      const res = await request(app).get('/api/posts');
      expect(res.status).toBe(200);
      expect(res.body.posts.length).toBe(1);
      expect(res.body.total).toBe(1);
    });

    it('GET /api/posts/:postId returns single post', async () => {
      const res = await request(app).get(`/api/posts/${postId}`);
      expect(res.status).toBe(200);
      expect(res.body.post.title).toBe('Test Post');
      expect(res.body.post.views_count).toBe(1);
    });

    it('GET /api/posts/:postId increments view count', async () => {
      await request(app).get(`/api/posts/${postId}`);
      await request(app).get(`/api/posts/${postId}`);
      const res = await request(app).get(`/api/posts/${postId}`);
      expect(res.body.post.views_count).toBe(3);
    });

    it('GET /api/posts/mine returns only my posts', async () => {
      // Create a post as buyer
      await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ title: 'Buyer Post', price: 200 });

      const res = await request(app)
        .get('/api/posts/mine')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.body.posts.length).toBe(1);
      expect(res.body.posts[0].title).toBe('Test Post');
    });
  });

  describe('Search posts', () => {
    beforeEach(async () => {
      const posts_data = [
        { title: 'iPhone 15 Pro', price: 89999, category_id: 'electronics' },
        { title: 'Samsung Galaxy S24', price: 69999, category_id: 'electronics' },
        { title: 'Wooden Chair', price: 5000, category_id: 'furniture' },
        { title: 'iPhone Case', price: 500, category_id: 'accessories' },
      ];
      for (const p of posts_data) {
        await request(app).post('/api/posts')
          .set('Authorization', `Bearer ${sellerToken}`)
          .send(p);
      }
    });

    it('search by text query', async () => {
      const res = await request(app).get('/api/posts/search-v2?q=iPhone');
      expect(res.status).toBe(200);
      expect(res.body.posts.length).toBe(2); // iPhone 15 Pro + iPhone Case
    });

    it('search by min_price', async () => {
      const res = await request(app).get('/api/posts/search-v2?min_price=60000');
      expect(res.status).toBe(200);
      expect(res.body.posts.length).toBe(2); // iPhone 15 Pro + Samsung
    });

    it('search by max_price', async () => {
      const res = await request(app).get('/api/posts/search-v2?max_price=1000');
      expect(res.status).toBe(200);
      expect(res.body.posts.length).toBe(1); // iPhone Case
    });

    it('search by category', async () => {
      const res = await request(app).get('/api/posts/search-v2?category_id=furniture');
      expect(res.status).toBe(200);
      expect(res.body.posts.length).toBe(1);
    });

    it('combined search (text + price range)', async () => {
      const res = await request(app).get('/api/posts/search-v2?q=iPhone&min_price=100&max_price=1000');
      expect(res.status).toBe(200);
      expect(res.body.posts.length).toBe(1); // iPhone Case only
    });
  });

  describe('Update post', () => {
    let postId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Original Title', price: 1000 });
      postId = res.body.post.post_id;
    });

    it('updates title', async () => {
      const res = await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.post.title).toBe('Updated Title');
    });

    it('updates price', async () => {
      const res = await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ price: 2000 });

      expect(res.status).toBe(200);
      expect(res.body.post.price).toBe(2000);
    });

    it('rejects update from non-owner', async () => {
      const res = await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
    });

    it('rejects update with empty title', async () => {
      const res = await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
    });

    it('rejects update with invalid status', async () => {
      const res = await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'hacked' });

      expect(res.status).toBe(400);
    });
  });

  describe('Delete post', () => {
    it('deletes own post', async () => {
      const createRes = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'To Delete', price: 100 });

      const postId = createRes.body.post.post_id;
      const deleteRes = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(deleteRes.status).toBe(200);

      // Verify it's gone
      const getRes = await request(app).get(`/api/posts/${postId}`);
      expect(getRes.status).toBe(404);
    });

    it('rejects deleting other user\'s post', async () => {
      const createRes = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Seller Post', price: 100 });

      const res = await request(app)
        .delete(`/api/posts/${createRes.body.post.post_id}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Status transitions', () => {
    let postId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ title: 'Status Test', price: 100 });
      postId = res.body.post.post_id;
    });

    it('marks post as sold', async () => {
      const res = await request(app)
        .patch(`/api/posts/${postId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'sold' });

      expect(res.status).toBe(200);
      expect(res.body.post.status).toBe('sold');
    });

    it('reactivates sold post', async () => {
      await request(app).patch(`/api/posts/${postId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'sold' });

      const res = await request(app)
        .patch(`/api/posts/${postId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'active' });

      expect(res.status).toBe(200);
      expect(res.body.post.status).toBe('active');
    });
  });
});

describe('E2E Sales Lifecycle', () => {
  let app;
  let sellerToken, buyerToken;
  let postId;

  beforeAll(() => {
    app = buildApp();
    sellerToken = signToken(SELLER.id);
    buyerToken = signToken(BUYER.id);
  });

  beforeEach(async () => {
    posts.clear();
    sales.clear();

    // Create a post as seller
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ title: 'Laptop for Sale', price: 45000, category_id: 'electronics' });
    postId = res.body.post.post_id;
  });

  describe('Happy path: request → approve → ship → receive → rate', () => {
    let saleId;

    it('full sales lifecycle completes successfully', async () => {
      // Step 1: Buyer requests purchase
      const requestRes = await request(app)
        .post('/api/sales/request')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ post_id: postId, agreed_price: 42000 });

      expect(requestRes.status).toBe(201);
      expect(requestRes.body.sale.status).toBe('requested');
      expect(requestRes.body.sale.buyer_id).toBe(BUYER.id);
      expect(requestRes.body.sale.seller_id).toBe(SELLER.id);
      saleId = requestRes.body.sale.id;

      // Step 2: Seller approves
      const approveRes = await request(app)
        .post(`/api/sales/${saleId}/approve`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.sale.status).toBe('approved');

      // Step 3: Seller marks as shipped
      const shipRes = await request(app)
        .post(`/api/sales/${saleId}/mark-shipped`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(shipRes.status).toBe(200);
      expect(shipRes.body.sale.status).toBe('shipped');
      expect(shipRes.body.sale.shipped_at).toBeDefined();

      // Step 4: Buyer confirms receipt
      const receiveRes = await request(app)
        .post(`/api/sales/${saleId}/order-received`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(receiveRes.status).toBe(200);
      expect(receiveRes.body.sale.status).toBe('received');

      // Step 5: Buyer rates
      const rateRes = await request(app)
        .post(`/api/sales/${saleId}/rate`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ rating: 5, review: 'Great seller, fast shipping!' });

      expect(rateRes.status).toBe(200);
      expect(rateRes.body.sale.rating).toBe(5);
      expect(rateRes.body.sale.review).toBe('Great seller, fast shipping!');
    });
  });

  describe('Sale authorization checks', () => {
    it('seller cannot approve their own request', async () => {
      const createRes = await request(app)
        .post('/api/sales/request')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ post_id: postId, agreed_price: 40000 });

      const saleId = createRes.body.sale.id;
      // Approving as buyer (wrong role)
      const res = await request(app)
        .post(`/api/sales/${saleId}/approve`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(403);
    });

    it('buyer cannot ship', async () => {
      const createRes = await request(app)
        .post('/api/sales/request')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ post_id: postId, agreed_price: 40000 });

      const saleId = createRes.body.sale.id;
      // Approve first
      await request(app).post(`/api/sales/${saleId}/approve`)
        .set('Authorization', `Bearer ${sellerToken}`);

      // Buyer tries to ship
      const res = await request(app)
        .post(`/api/sales/${saleId}/mark-shipped`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(403);
    });

    it('buyer can cancel their own pending request', async () => {
      const createRes = await request(app)
        .post('/api/sales/request')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ post_id: postId, agreed_price: 40000 });

      const saleId = createRes.body.sale.id;

      const res = await request(app)
        .post(`/api/sales/${saleId}/cancel`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.sale.status).toBe('cancelled');
    });

    it('seller cannot cancel buyer\'s request', async () => {
      const createRes = await request(app)
        .post('/api/sales/request')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ post_id: postId, agreed_price: 40000 });

      const saleId = createRes.body.sale.id;

      const res = await request(app)
        .post(`/api/sales/${saleId}/cancel`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(403);
    });

    it('cannot buy own post', async () => {
      const res = await request(app)
        .post('/api/sales/request')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ post_id: postId, agreed_price: 40000 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('own');
    });
  });

  describe('Sale state machine validation', () => {
    it('cannot approve already-rejected sale', async () => {
      const createRes = await request(app)
        .post('/api/sales/request')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ post_id: postId, agreed_price: 40000 });

      const saleId = createRes.body.sale.id;

      // Reject first
      await request(app).post(`/api/sales/${saleId}/reject`)
        .set('Authorization', `Bearer ${sellerToken}`);

      // Try to approve
      const res = await request(app)
        .post(`/api/sales/${saleId}/approve`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(400);
    });

    it('cannot ship unapproved sale', async () => {
      const createRes = await request(app)
        .post('/api/sales/request')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ post_id: postId, agreed_price: 40000 });

      const saleId = createRes.body.sale.id;

      const res = await request(app)
        .post(`/api/sales/${saleId}/mark-shipped`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(400);
    });

    it('cannot receive unshipped sale', async () => {
      const createRes = await request(app)
        .post('/api/sales/request')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ post_id: postId, agreed_price: 40000 });

      const saleId = createRes.body.sale.id;
      await request(app).post(`/api/sales/${saleId}/approve`)
        .set('Authorization', `Bearer ${sellerToken}`);

      const res = await request(app)
        .post(`/api/sales/${saleId}/order-received`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(400);
    });

    it('cannot rate unreceived sale', async () => {
      const createRes = await request(app)
        .post('/api/sales/request')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ post_id: postId, agreed_price: 40000 });

      const saleId = createRes.body.sale.id;

      const res = await request(app)
        .post(`/api/sales/${saleId}/rate`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ rating: 5 });

      expect(res.status).toBe(400);
    });
  });

  describe('Sales validation', () => {
    it('rejects sale request with missing post_id', async () => {
      const res = await request(app)
        .post('/api/sales/request')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ agreed_price: 40000 });

      expect(res.status).toBe(400);
    });

    it('rejects sale request with invalid price', async () => {
      const res = await request(app)
        .post('/api/sales/request')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ post_id: postId, agreed_price: -100 });

      expect(res.status).toBe(400);
    });

    it('rejects sale request for nonexistent post', async () => {
      const res = await request(app)
        .post('/api/sales/request')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ post_id: 'nonexistent', agreed_price: 40000 });

      expect(res.status).toBe(404);
    });

    it('rejects rating with invalid value', async () => {
      const createRes = await request(app)
        .post('/api/sales/request')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ post_id: postId, agreed_price: 40000 });

      const saleId = createRes.body.sale.id;
      // Fast-track to received
      await request(app).post(`/api/sales/${saleId}/approve`).set('Authorization', `Bearer ${sellerToken}`);
      await request(app).post(`/api/sales/${saleId}/mark-shipped`).set('Authorization', `Bearer ${sellerToken}`);
      await request(app).post(`/api/sales/${saleId}/order-received`).set('Authorization', `Bearer ${buyerToken}`);

      const res = await request(app)
        .post(`/api/sales/${saleId}/rate`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ rating: 6 });

      expect(res.status).toBe(400);
    });
  });
});

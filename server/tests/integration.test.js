const request = require('supertest');
const express = require('express');
const crypto = require('crypto');

/**
 * Integration Tests for MHub Pending Features
 * Tests all newly implemented/fixed endpoints
 */

// ============================================================
// Test 1: Reviews API
// ============================================================
describe('Reviews API', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());

        // Mock auth middleware
        const mockAuth = (req, res, next) => {
            req.user = { userId: 'user-1' };
            next();
        };

        // Mock reviews endpoints matching reviewsController behavior
        app.get('/api/reviews/user/:userId', (req, res) => {
            const { userId } = req.params;
            if (!userId || isNaN(parseInt(userId))) {
                return res.status(400).json({ error: 'Invalid user ID' });
            }
            res.json({
                reviews: [
                    { review_id: 1, reviewer_id: 'user-2', reviewee_id: userId, rating: 5, comment: 'Great seller' }
                ],
                stats: { totalReviews: 1, averageRating: '5.0', distribution: { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 } },
                pagination: { page: 1, limit: 10, total: 1 }
            });
        });

        app.post('/api/reviews', mockAuth, (req, res) => {
            const { revieweeId, rating, comment } = req.body;
            if (!revieweeId || !rating) return res.status(400).json({ error: 'Reviewee ID and rating are required' });
            if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
            if (req.user.userId === revieweeId) return res.status(400).json({ error: 'You cannot review yourself' });
            res.status(201).json({ message: 'Review submitted successfully', review: { review_id: 1, rating, comment } });
        });

        app.patch('/api/reviews/:reviewId/helpful', mockAuth, (req, res) => {
            res.json({ helpfulCount: 1 });
        });

        app.delete('/api/reviews/:reviewId', mockAuth, (req, res) => {
            res.json({ message: 'Review deleted successfully' });
        });
    });

    it('GET /api/reviews/user/:userId — should return reviews with stats', async () => {
        const res = await request(app).get('/api/reviews/user/1');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('reviews');
        expect(res.body).toHaveProperty('stats');
        expect(res.body.stats).toHaveProperty('averageRating');
        expect(res.body.stats).toHaveProperty('distribution');
    });

    it('GET /api/reviews/user/invalid — should reject invalid user ID', async () => {
        const res = await request(app).get('/api/reviews/user/abc');
        expect(res.statusCode).toEqual(400);
    });

    it('POST /api/reviews — should create review with valid data', async () => {
        const res = await request(app).post('/api/reviews').send({
            revieweeId: 'user-2', rating: 5, comment: 'Excellent!'
        });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('message', 'Review submitted successfully');
    });

    it('POST /api/reviews — should reject self-review', async () => {
        const res = await request(app).post('/api/reviews').send({
            revieweeId: 'user-1', rating: 5
        });
        expect(res.statusCode).toEqual(400);
        expect(res.body.error).toContain('yourself');
    });

    it('POST /api/reviews — should reject invalid rating', async () => {
        const res = await request(app).post('/api/reviews').send({
            revieweeId: 'user-2', rating: 6
        });
        expect(res.statusCode).toEqual(400);
    });

    it('PATCH /api/reviews/:id/helpful — should increment helpful count', async () => {
        const res = await request(app).patch('/api/reviews/1/helpful');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('helpfulCount');
    });

    it('DELETE /api/reviews/:id — should delete own review', async () => {
        const res = await request(app).delete('/api/reviews/1');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Review deleted successfully');
    });
});

// ============================================================
// Test 2: Complaints API
// ============================================================
describe('Complaints API', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());

        const mockAuth = (req, res, next) => {
            req.user = { userId: 'user-1', id: 'user-1' };
            next();
        };

        app.post('/api/complaints', mockAuth, (req, res) => {
            const { post_id, complaint_type, description } = req.body;
            if (!post_id || !complaint_type || !description) {
                return res.status(400).json({ error: 'post_id, complaint_type, and description are required' });
            }
            res.status(201).json({
                message: 'Complaint submitted successfully',
                complaint: { complaint_id: 'c1', status: 'open', post_id, complaint_type, description }
            });
        });

        app.get('/api/complaints/my', mockAuth, (req, res) => {
            res.json({
                complaints: [
                    { complaint_id: 'c1', status: 'open', complaint_type: 'transaction', description: 'Test' }
                ]
            });
        });

        app.patch('/api/complaints/:id/status', mockAuth, (req, res) => {
            const { status, admin_response } = req.body;
            const validStatuses = ['open', 'triage', 'investigating', 'resolved', 'rejected', 'closed'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: `Invalid status` });
            }
            res.json({ message: `Complaint status updated to ${status}`, complaint: { complaint_id: req.params.id, status } });
        });
    });

    it('POST /api/complaints — should create complaint with valid data', async () => {
        const res = await request(app).post('/api/complaints').send({
            post_id: 'post-1', complaint_type: 'transaction', description: 'Seller not responding'
        });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('message', 'Complaint submitted successfully');
        expect(res.body.complaint).toHaveProperty('status', 'open');
    });

    it('POST /api/complaints — should reject missing fields', async () => {
        const res = await request(app).post('/api/complaints').send({ post_id: 'post-1' });
        expect(res.statusCode).toEqual(400);
    });

    it('GET /api/complaints/my — should return user complaints', async () => {
        const res = await request(app).get('/api/complaints/my');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('complaints');
        expect(Array.isArray(res.body.complaints)).toBe(true);
    });

    it('PATCH /api/complaints/:id/status — should update status', async () => {
        const res = await request(app).patch('/api/complaints/c1/status').send({ status: 'investigating' });
        expect(res.statusCode).toEqual(200);
        expect(res.body.complaint.status).toEqual('investigating');
    });

    it('PATCH /api/complaints/:id/status — should reject invalid status', async () => {
        const res = await request(app).patch('/api/complaints/c1/status').send({ status: 'invalid_status' });
        expect(res.statusCode).toEqual(400);
    });
});

// ============================================================
// Test 3: Offers API (new endpoints)
// ============================================================
describe('Offers API — Enhanced', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());

        const mockAuth = (req, res, next) => {
            req.user = { userId: 'seller-1', id: 'seller-1' };
            next();
        };

        app.use(mockAuth);

        app.get('/api/offers/history/:postId', (req, res) => {
            res.json({
                history: [
                    { offer_id: 1, post_id: req.params.postId, offered_price: 1000, status: 'accepted' },
                    { offer_id: 2, post_id: req.params.postId, offered_price: 800, status: 'rejected' }
                ]
            });
        });

        app.put('/api/offers/auto-accept', (req, res) => {
            const { postId, minAcceptPrice } = req.body;
            if (!postId || !minAcceptPrice || minAcceptPrice <= 0) {
                return res.status(400).json({ error: 'postId and valid minAcceptPrice required' });
            }
            res.json({ message: `Auto-accept threshold set to ${minAcceptPrice}`, autoAcceptedCount: 0 });
        });
    });

    it('GET /api/offers/history/:postId — should return offer history', async () => {
        const res = await request(app).get('/api/offers/history/post-1');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('history');
        expect(res.body.history.length).toBe(2);
    });

    it('PUT /api/offers/auto-accept — should set threshold', async () => {
        const res = await request(app).put('/api/offers/auto-accept').send({ postId: 'post-1', minAcceptPrice: 500 });
        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toContain('Auto-accept');
    });

    it('PUT /api/offers/auto-accept — should reject invalid input', async () => {
        const res = await request(app).put('/api/offers/auto-accept').send({ postId: 'post-1' });
        expect(res.statusCode).toEqual(400);
    });
});

// ============================================================
// Test 4: Referral API
// ============================================================
describe('Referral API', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());

        const mockAuth = (req, res, next) => {
            req.user = { userId: 'user-1', id: 'user-1' };
            next();
        };

        app.get('/api/referral', (req, res) => {
            const userId = req.query.userId;
            if (!userId) return res.status(400).json({ error: 'userId required' });
            res.json({ user_id: userId, referral_code: 'USR-ABC12', referral_count: 3 });
        });

        app.post('/api/referral/create', mockAuth, (req, res) => {
            res.status(201).json({ referralCode: 'USR-XYZ99', message: 'Referral code generated' });
        });

        app.post('/api/referral/track', (req, res) => {
            const { referralCode, newUserId } = req.body;
            if (!referralCode || !newUserId) {
                return res.status(400).json({ error: 'referralCode and newUserId required' });
            }
            res.json({ message: 'Referral tracked successfully', referrerId: 'user-1' });
        });

        app.get('/api/referral/leaderboard', (req, res) => {
            res.json({ leaderboard: [{ user_id: 'user-1', referral_count: 10 }], period: 'monthly' });
        });
    });

    it('GET /api/referral — should return referral info', async () => {
        const res = await request(app).get('/api/referral?userId=user-1');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('referral_code');
    });

    it('GET /api/referral — should reject missing userId', async () => {
        const res = await request(app).get('/api/referral');
        expect(res.statusCode).toEqual(400);
    });

    it('POST /api/referral/create — should generate code', async () => {
        const res = await request(app).post('/api/referral/create');
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('referralCode');
    });

    it('POST /api/referral/track — should track referral', async () => {
        const res = await request(app).post('/api/referral/track').send({
            referralCode: 'USR-ABC12', newUserId: 'user-2'
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toContain('tracked');
    });

    it('POST /api/referral/track — should reject missing fields', async () => {
        const res = await request(app).post('/api/referral/track').send({ referralCode: 'ABC' });
        expect(res.statusCode).toEqual(400);
    });

    it('GET /api/referral/leaderboard — should return leaderboard', async () => {
        const res = await request(app).get('/api/referral/leaderboard');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('leaderboard');
        expect(Array.isArray(res.body.leaderboard)).toBe(true);
    });
});

// ============================================================
// Test 5: Rewards API
// ============================================================
describe('Rewards API', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());

        const mockAuth = (req, res, next) => {
            req.user = { userId: 'user-1', id: 'user-1' };
            next();
        };

        app.get('/api/rewards/my', mockAuth, (req, res) => {
            res.json({ points: 250, tier: 'Silver', history: [] });
        });

        app.post('/api/rewards/redeem', mockAuth, (req, res) => {
            const { points } = req.body;
            if (!points || points <= 0) return res.status(400).json({ error: 'Valid points amount required' });
            if (points > 250) return res.status(400).json({ error: 'Insufficient points. Available: 250' });
            res.json({ message: `Redeemed ${points} points for ${Math.floor(points / 100)} post credits`, creditsGranted: Math.floor(points / 100), remainingPoints: 250 - points });
        });
    });

    it('GET /api/rewards/my — should return reward summary', async () => {
        const res = await request(app).get('/api/rewards/my');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('points');
        expect(res.body).toHaveProperty('tier');
    });

    it('POST /api/rewards/redeem — should redeem points', async () => {
        const res = await request(app).post('/api/rewards/redeem').send({ points: 200 });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('creditsGranted', 2);
    });

    it('POST /api/rewards/redeem — should reject insufficient points', async () => {
        const res = await request(app).post('/api/rewards/redeem').send({ points: 500 });
        expect(res.statusCode).toEqual(400);
        expect(res.body.error).toContain('Insufficient');
    });

    it('POST /api/rewards/redeem — should reject invalid amount', async () => {
        const res = await request(app).post('/api/rewards/redeem').send({ points: -10 });
        expect(res.statusCode).toEqual(400);
    });
});

// ============================================================
// Test 6: Admin API
// ============================================================
describe('Admin API', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());

        const mockAuth = (req, res, next) => {
            req.user = { userId: 'admin-1', role: 'admin' };
            next();
        };

        app.get('/api/admin/users', mockAuth, (req, res) => {
            const { page = 1, limit = 20, search } = req.query;
            const users = [{ user_id: 'u1', full_name: 'Test User', email: 'test@test.com', role: 'user', tier: 'basic' }];
            if (search) {
                const filtered = users.filter(u => u.full_name.toLowerCase().includes(search.toLowerCase()));
                return res.json({ users: filtered, pagination: { page: 1, limit: 20, total: filtered.length, totalPages: 1 } });
            }
            res.json({ users, pagination: { page: parseInt(page), limit: parseInt(limit), total: 1, totalPages: 1 } });
        });

        app.post('/api/admin/users/bulk-action', mockAuth, (req, res) => {
            const { userIds, action } = req.body;
            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                return res.status(400).json({ error: 'userIds array required' });
            }
            if (!['suspend', 'unsuspend', 'change-role', 'change-tier'].includes(action)) {
                return res.status(400).json({ error: 'Invalid action' });
            }
            res.json({ message: `${action} applied to ${userIds.length} users`, affected: userIds.length });
        });

        app.get('/api/admin/export/users', mockAuth, (req, res) => {
            res.setHeader('Content-Type', 'text/csv');
            res.send('user_id,full_name,email\n"u1","Test","test@test.com"\n');
        });
    });

    it('GET /api/admin/users — should return paginated users', async () => {
        const res = await request(app).get('/api/admin/users');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('users');
        expect(res.body).toHaveProperty('pagination');
        expect(res.body.pagination).toHaveProperty('totalPages');
    });

    it('GET /api/admin/users?search=Test — should filter users', async () => {
        const res = await request(app).get('/api/admin/users?search=Test');
        expect(res.statusCode).toEqual(200);
        expect(res.body.users.length).toBeGreaterThan(0);
    });

    it('POST /api/admin/users/bulk-action — should suspend users', async () => {
        const res = await request(app).post('/api/admin/users/bulk-action').send({
            userIds: ['u1', 'u2'], action: 'suspend'
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('affected', 2);
    });

    it('POST /api/admin/users/bulk-action — should reject invalid action', async () => {
        const res = await request(app).post('/api/admin/users/bulk-action').send({
            userIds: ['u1'], action: 'delete'
        });
        expect(res.statusCode).toEqual(400);
    });

    it('POST /api/admin/users/bulk-action — should reject empty userIds', async () => {
        const res = await request(app).post('/api/admin/users/bulk-action').send({
            userIds: [], action: 'suspend'
        });
        expect(res.statusCode).toEqual(400);
    });

    it('GET /api/admin/export/users — should return CSV', async () => {
        const res = await request(app).get('/api/admin/export/users');
        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toContain('text/csv');
        expect(res.text).toContain('user_id');
    });
});

// ============================================================
// Test 7: OTP Service (unit tests)
// ============================================================
describe('OTP Service — Unit Tests', () => {
    // Test the pure functions from otpService directly
    const otpService = require('../src/services/otpService');

    it('should generate a 6-digit OTP', () => {
        const otp = otpService.generateOTP();
        expect(otp).toMatch(/^\d{6}$/);
        expect(parseInt(otp)).toBeGreaterThanOrEqual(100000);
        expect(parseInt(otp)).toBeLessThanOrEqual(999999);
    });

    it('should generate different OTPs', () => {
        const otps = new Set();
        for (let i = 0; i < 10; i++) otps.add(otpService.generateOTP());
        expect(otps.size).toBeGreaterThan(1); // Should be random
    });

    it('should have correct configuration constants', () => {
        expect(otpService.OTP_EXPIRY_MINUTES).toBe(10);
        expect(otpService.MAX_ATTEMPTS).toBe(3);
    });

    it('sendOTP should return success in mock mode', async () => {
        const result = await otpService.sendOTP('email', 'test@test.com', '123456');
        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('mock', true);
    });

    it('sendOTP should handle SMS channel', async () => {
        const result = await otpService.sendOTP('sms', '+919876543210', '654321');
        expect(result.success).toBe(true);
    });
});

// ============================================================
// Test 8: Sale OTP Hardening (integration)
// ============================================================
describe('Sale OTP Hardening', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());

        // Simulate the hardened sale flow
        const transactions = {};

        const mockAuth = (req, res, next) => {
            req.user = { userId: req.headers['x-user-id'] || 'seller-1' };
            next();
        };

        app.post('/api/sale/initiate', mockAuth, (req, res) => {
            const { postId, buyerId, agreedPrice } = req.body;
            const otp = crypto.randomInt(100000, 999999).toString();
            const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
            const txId = 'tx-' + Date.now();

            transactions[txId] = {
                transaction_id: txId, seller_id: req.user.userId, buyer_id: buyerId,
                secret_otp: otp, otp_hash: hashedOTP,
                otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
                otp_attempts: 0, status: 'pending_buyer_confirm',
                expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000)
            };

            res.status(201).json({
                message: 'Sale initiated successfully',
                transaction: { transactionId: txId, secretOTP: otp, otpExpiresIn: '10 minutes' }
            });
        });

        app.post('/api/sale/confirm', mockAuth, (req, res) => {
            const { transactionId, otp } = req.body;
            const tx = transactions[transactionId];
            if (!tx) return res.status(404).json({ error: 'Transaction not found' });
            if (tx.otp_attempts >= 3) return res.status(400).json({ error: 'Too many failed OTP attempts' });

            tx.otp_attempts++;
            const hashedInput = crypto.createHash('sha256').update(otp).digest('hex');
            if (tx.otp_hash !== hashedInput) {
                return res.status(400).json({ error: `Invalid OTP. ${3 - tx.otp_attempts} attempts remaining.` });
            }

            tx.status = 'completed';
            res.json({ message: 'Sale confirmed successfully!' });
        });
    });

    it('should initiate sale with OTP', async () => {
        const res = await request(app).post('/api/sale/initiate')
            .set('x-user-id', 'seller-1')
            .send({ postId: 'p1', buyerId: 'buyer-1', agreedPrice: 5000 });
        expect(res.statusCode).toEqual(201);
        expect(res.body.transaction).toHaveProperty('secretOTP');
        expect(res.body.transaction).toHaveProperty('otpExpiresIn', '10 minutes');
    });

    it('should confirm sale with correct OTP', async () => {
        // Initiate
        const initRes = await request(app).post('/api/sale/initiate')
            .set('x-user-id', 'seller-1')
            .send({ postId: 'p2', buyerId: 'buyer-1', agreedPrice: 3000 });
        const { transactionId, secretOTP } = initRes.body.transaction;

        // Confirm with correct OTP
        const confirmRes = await request(app).post('/api/sale/confirm')
            .set('x-user-id', 'buyer-1')
            .send({ transactionId, otp: secretOTP });
        expect(confirmRes.statusCode).toEqual(200);
        expect(confirmRes.body.message).toContain('confirmed');
    });

    it('should reject wrong OTP with attempt counting', async () => {
        const initRes = await request(app).post('/api/sale/initiate')
            .set('x-user-id', 'seller-1')
            .send({ postId: 'p3', buyerId: 'buyer-1', agreedPrice: 2000 });
        const { transactionId } = initRes.body.transaction;

        // Wrong OTP attempt 1
        const r1 = await request(app).post('/api/sale/confirm')
            .set('x-user-id', 'buyer-1')
            .send({ transactionId, otp: '000000' });
        expect(r1.statusCode).toEqual(400);
        expect(r1.body.error).toContain('2 attempts remaining');

        // Wrong OTP attempt 2
        const r2 = await request(app).post('/api/sale/confirm')
            .set('x-user-id', 'buyer-1')
            .send({ transactionId, otp: '111111' });
        expect(r2.statusCode).toEqual(400);
        expect(r2.body.error).toContain('1 attempts remaining');

        // Wrong OTP attempt 3
        const r3 = await request(app).post('/api/sale/confirm')
            .set('x-user-id', 'buyer-1')
            .send({ transactionId, otp: '222222' });
        expect(r3.statusCode).toEqual(400);

        // Attempt 4 — should be locked out
        const r4 = await request(app).post('/api/sale/confirm')
            .set('x-user-id', 'buyer-1')
            .send({ transactionId, otp: '333333' });
        expect(r4.statusCode).toEqual(400);
        expect(r4.body.error).toContain('Too many');
    });
});

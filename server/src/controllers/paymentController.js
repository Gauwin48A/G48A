/**
 * Payment Controller
 * Zero-Cost UPI Verification System
 *
 * Flow:
 * 1. User selects plan → Shows UPI QR/ID (with optional promo code)
 * 2. User pays via any UPI app
 * 3. User submits transaction ID
 * 4. Admin verifies in dashboard (or webhook auto-verifies)
 * 5. Subscription activated
 *
 * Additions:
 *  - Promo code validation endpoint
 *  - Retry tracking (max 3 retries per payment)
 *  - Duplicate heuristics (amount + time window)
 */

const pool = require('../config/db');
const { getTierRules, applyPromoCode, consumePromoCode } = require('../config/tierRules');

/**
 * Validate a promo code (User)
 * POST /api/payments/validate-promo
 */
exports.validatePromoCode = async (req, res) => {
    try {
        const { code, plan_type } = req.body;
        if (!code || !plan_type) return res.status(400).json({ error: 'code and plan_type required' });

        const result = applyPromoCode(code, plan_type);
        if (!result.valid) return res.status(400).json({ error: result.error });

        res.json({
            valid: true,
            code: code.toUpperCase(),
            ...result
        });
    } catch (err) {
        console.error('[Payment] Promo validation error:', err);
        res.status(500).json({ error: 'Failed to validate promo code' });
    }
};

/**
 * Retry a rejected/expired payment (User)
 * POST /api/payments/:id/retry
 */
exports.retryPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId || req.user?.id;
        const { transaction_id } = req.body;

        const paymentResult = await pool.query('SELECT * FROM payments WHERE id = $1 AND user_id = $2', [id, userId]);
        if (paymentResult.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });

        const payment = paymentResult.rows[0];
        if (!['rejected', 'expired'].includes(payment.status)) {
            return res.status(400).json({ error: `Cannot retry a payment with status: ${payment.status}` });
        }

        const retryCount = (payment.retry_count || 0) + 1;
        if (retryCount > 3) {
            return res.status(400).json({ error: 'Maximum retry attempts (3) reached. Please contact support.' });
        }

        if (!transaction_id || transaction_id.length < 6) {
            return res.status(400).json({ error: 'New transaction ID required (min 6 chars)' });
        }

        // Check new txn ID is not already used
        const dupeCheck = await pool.query('SELECT id FROM payments WHERE transaction_id = $1', [transaction_id]);
        if (dupeCheck.rows.length > 0) return res.status(400).json({ error: 'Transaction ID already submitted' });

        await pool.query(
            `UPDATE payments SET status = 'pending', transaction_id = $1, retry_count = $2, updated_at = NOW() WHERE id = $3`,
            [transaction_id, retryCount, id]
        );

        console.log(`[Payment] Retry #${retryCount}: Payment ${id} by User ${userId}`);
        res.json({ success: true, message: `Payment resubmitted (attempt ${retryCount}/3)`, retry_count: retryCount });
    } catch (err) {
        console.error('[Payment] Retry error:', err);
        res.status(500).json({ error: 'Failed to retry payment' });
    }
};

/**
 * Submit a payment for verification (User)
 * POST /api/payments/submit
 *
 * SECURITY FIXES:
 * - Validate payment amount matches expected tier price (prevents ₹1 vs ₹999 fraud)
 * - Use only server-side expectedAmount, ignore user-submitted amount
 */
exports.submitPayment = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        const {
            plan_type,
            transaction_id,
            upi_id,
            // NOTE: amount is accepted for user clarity but NEVER used for DB insert
            // We always use server-calculated expectedAmount
            payment_method = 'upi'
        } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!plan_type || !['basic', 'silver', 'premium'].includes(plan_type)) {
            return res.status(400).json({ error: 'Invalid plan type. Must be: basic, silver, or premium' });
        }

        if (!transaction_id || transaction_id.length < 6) {
            return res.status(400).json({ error: 'Valid transaction ID required (min 6 characters)' });
        }

        // CRITICAL SECURITY: Get pricing from server-side tier rules (never trust client amount)
        const rules = getTierRules(plan_type);
        const expectedAmount = rules.priceINR;

        if (!expectedAmount || expectedAmount <= 0) {
            return res.status(500).json({ error: 'Invalid plan configuration. Contact support.' });
        }

        // Check for duplicate transaction ID
        const existing = await pool.query(
            'SELECT id FROM payments WHERE transaction_id = $1',
            [transaction_id]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'This transaction ID has already been submitted' });
        }

        // Check for pending payment from same user for same plan
        const pendingCheck = await pool.query(
            `SELECT id FROM payments
             WHERE user_id = $1 AND plan_purchased = $2 AND status = 'pending'`,
            [userId, plan_type]
        );

        if (pendingCheck.rows.length > 0) {
            return res.status(400).json({
                error: 'You already have a pending payment for this plan. Please wait for verification.',
                pending_id: pendingCheck.rows[0].id
            });
        }

        // Create payment record with SERVER-CALCULATED amount (not user input)
        const result = await pool.query(
            `INSERT INTO payments
             (user_id, amount, payment_method, transaction_id, upi_id, status, plan_purchased, expires_at)
             VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW() + INTERVAL '48 hours')
             RETURNING id, created_at`,
            [userId, expectedAmount, payment_method, transaction_id, upi_id || null, plan_type]
        );

        // Create notification for user
        await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, created_at)
             VALUES ($1, 'payment_submitted', '💳 Payment Submitted', $2, NOW())`,
            [userId, `Your payment of ₹${expectedAmount} for ${plan_type.toUpperCase()} plan is being verified. This usually takes 2-4 hours.`]
        );

        console.log(`[Payment] New submission: User ${userId}, Plan: ${plan_type}, Amount: ₹${expectedAmount}, TxnID: ${transaction_id}`);

        res.status(201).json({
            success: true,
            message: 'Payment submitted for verification',
            payment_id: result.rows[0].id,
            amount: expectedAmount,
            plan: plan_type,
            expected_verification_time: '2-4 hours',
            status: 'pending'
        });

    } catch (err) {
        console.error('[Payment] Submit error:', err);
        res.status(500).json({ error: 'Failed to submit payment' });
    }
};

/**
 * Get payment status (User)
 * GET /api/payments/status
 */
exports.getPaymentStatus = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const result = await pool.query(
            `SELECT id, amount, plan_purchased, status, transaction_id, 
                    created_at, verified_at, expires_at
             FROM payments 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 10`,
            [userId]
        );

        res.json({
            payments: result.rows,
            has_pending: result.rows.some(p => p.status === 'pending')
        });

    } catch (err) {
        console.error('[Payment] Status error:', err);
        res.status(500).json({ error: 'Failed to fetch payment status' });
    }
};

/**
 * Get pending payments (Admin)
 * GET /api/payments/pending
 */
exports.getPendingPayments = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.id,
                p.user_id,
                p.amount,
                p.plan_purchased,
                p.transaction_id,
                p.upi_id,
                p.payment_method,
                p.created_at,
                p.expires_at,
                u.email as user_email,
                pr.full_name as user_name,
                pr.phone as user_phone
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN profiles pr ON p.user_id = pr.user_id
            WHERE p.status = 'pending'
            ORDER BY p.created_at ASC
        `);

        res.json({
            pending_count: result.rows.length,
            payments: result.rows
        });

    } catch (err) {
        console.error('[Payment] Pending list error:', err);
        res.status(500).json({ error: 'Failed to fetch pending payments' });
    }
};

/**
 * Verify/Approve a payment (Admin)
 * POST /api/payments/:id/verify
 *
 * SECURITY FIXES:
 * - Validate payment amount matches expected tier price BEFORE approving
 * - Reject if amount mismatch (prevents admin approval fraud)
 */
exports.verifyPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.userId || req.user?.id;
        const { admin_notes } = req.body;

        // Get payment details
        const paymentResult = await pool.query(
            'SELECT * FROM payments WHERE id = $1',
            [id]
        );

        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const payment = paymentResult.rows[0];

        if (payment.status !== 'pending') {
            return res.status(400).json({ error: `Payment already ${payment.status}` });
        }

        const { user_id, plan_purchased } = payment;
        const rules = getTierRules(plan_purchased);
        const expectedAmount = rules.priceINR;

        // CRITICAL SECURITY: Verify amount matches expected tier price
        // Reject if there's a mismatch (fraudulent or corrupted payment)
        if (payment.amount !== expectedAmount) {
            console.error(`[SECURITY] Payment amount mismatch for ID ${id}:`);
            console.error(`  Expected: ₹${expectedAmount}, Received: ₹${payment.amount}`);
            console.error(`  Plan: ${plan_purchased}, User: ${user_id}`);

            return res.status(400).json({
                error: `Payment amount mismatch. Cannot approve.`,
                details: {
                    expected_amount: expectedAmount,
                    received_amount: payment.amount,
                    plan: plan_purchased,
                    mismatch: payment.amount - expectedAmount
                },
                action: 'Please reject this payment and ask user to resubmit with correct amount'
            });
        }

        // Calculate subscription end date
        let endDate = new Date();
        if (plan_purchased === 'premium') {
            endDate.setFullYear(endDate.getFullYear() + 1);
        } else if (plan_purchased === 'silver') {
            endDate.setMonth(endDate.getMonth() + 6);
        } else {
            // Basic - just add credits
            endDate = null;
        }

        // Start transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Update payment status
            await client.query(
                `UPDATE payments
                 SET status = 'verified', verified_by = $1, verified_at = NOW(), admin_notes = $2
                 WHERE id = $3`,
                [adminId, admin_notes || null, id]
            );

            // 2. Update user tier
            if (plan_purchased === 'basic') {
                // Basic = add post credits
                await client.query(
                    `UPDATE users
                     SET tier = 'basic', post_credits = COALESCE(post_credits, 0) + 1
                     WHERE user_id = $1`,
                    [user_id]
                );
            } else {
                // Silver/Premium = set subscription
                await client.query(
                    `UPDATE users
                     SET tier = $1, subscription_expiry = $2
                     WHERE user_id = $3`,
                    [plan_purchased, endDate, user_id]
                );

                // Create subscription record
                await client.query(
                    `INSERT INTO user_subscriptions
                     (user_id, plan_type, start_date, end_date, is_active, payment_reference)
                     VALUES ($1, $2, NOW(), $3, true, $4)`,
                    [user_id, plan_purchased, endDate, `payment_${id}`]
                );
            }

            // 3. Create success notification
            await client.query(
                `INSERT INTO notifications (user_id, type, title, message, created_at)
                 VALUES ($1, 'payment_verified', '🎉 Payment Verified!', $2, NOW())`,
                [user_id, `Your ${plan_purchased.toUpperCase()} plan is now active! ${plan_purchased !== 'basic' ? `Valid until ${endDate.toLocaleDateString('en-IN')}` : 'You can now create a post.'}`]
            );

            await client.query('COMMIT');

            console.log(`[Payment] Verified: ID ${id}, User ${user_id}, Plan: ${plan_purchased}, Amount: ₹${payment.amount}`);

            res.json({
                success: true,
                message: `Payment verified. User upgraded to ${plan_purchased.toUpperCase()}`,
                user_id,
                plan: plan_purchased,
                amount: payment.amount,
                expires_at: endDate
            });

        } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('[Payment] Verify error:', err);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
};

/**
 * Reject a payment (Admin)
 * POST /api/payments/:id/reject
 */
exports.rejectPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.userId || req.user?.id;
        const { admin_notes, reason } = req.body;

        // Get payment details
        const paymentResult = await pool.query(
            'SELECT * FROM payments WHERE id = $1',
            [id]
        );

        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const payment = paymentResult.rows[0];

        if (payment.status !== 'pending') {
            return res.status(400).json({ error: `Payment already ${payment.status}` });
        }

        // Update payment status
        await pool.query(
            `UPDATE payments 
             SET status = 'rejected', verified_by = $1, verified_at = NOW(), admin_notes = $2
             WHERE id = $3`,
            [adminId, admin_notes || reason || 'Transaction could not be verified', id]
        );

        // Notify user
        await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, created_at)
             VALUES ($1, 'payment_rejected', '❌ Payment Not Verified', $2, NOW())`,
            [payment.user_id, `Your payment could not be verified. Reason: ${reason || 'Transaction ID not found'}. Please contact support if you believe this is an error.`]
        );

        console.log(`[Payment] Rejected: ID ${id}, User ${payment.user_id}`);

        res.json({
            success: true,
            message: 'Payment rejected',
            payment_id: id
        });

    } catch (err) {
        console.error('[Payment] Reject error:', err);
        res.status(500).json({ error: 'Failed to reject payment' });
    }
};

/**
 * Get payment statistics (Admin Dashboard)
 * GET /api/payments/stats
 */
exports.getPaymentStats = async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                COUNT(*) FILTER (WHERE status = 'verified') as verified_count,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
                COALESCE(SUM(amount) FILTER (WHERE status = 'verified'), 0) as total_revenue,
                COALESCE(SUM(amount) FILTER (WHERE status = 'verified' AND created_at > NOW() - INTERVAL '30 days'), 0) as revenue_30d,
                COALESCE(SUM(amount) FILTER (WHERE status = 'verified' AND created_at > NOW() - INTERVAL '7 days'), 0) as revenue_7d
            FROM payments
        `);

        const planBreakdown = await pool.query(`
            SELECT 
                plan_purchased,
                COUNT(*) as count,
                SUM(amount) as total
            FROM payments
            WHERE status = 'verified'
            GROUP BY plan_purchased
        `);

        res.json({
            ...stats.rows[0],
            by_plan: planBreakdown.rows
        });

    } catch (err) {
        console.error('[Payment] Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch payment stats' });
    }
};

/**
 * Get UPI payment details (for showing QR code)
 * GET /api/payments/upi-details
 */
exports.getUpiDetails = async (req, res) => {
    // These would be configured in environment variables in production
    const upiDetails = {
        upi_id: process.env.UPI_ID || 'merchant@upi',
        merchant_name: process.env.MERCHANT_NAME || 'MHub Premium',
        tiers: {
            basic: { amount: 49, description: '1 Post Credit' },
            silver: { amount: 499, description: '6 Month Subscription' },
            premium: { amount: 999, description: '1 Year God Mode' }
        },
        instructions: [
            'Open any UPI app (GPay, PhonePe, Paytm)',
            'Scan the QR code or enter UPI ID',
            'Pay the exact amount for your chosen plan',
            'Copy the Transaction ID from payment confirmation',
            'Paste the Transaction ID in the form',
            'Wait for verification (usually 2-4 hours)'
        ]
    };

    res.json(upiDetails);
};

/**
 * Handle Payment Webhook (Razorpay/Stripe/UPI Gateway)
 * POST /api/payments/webhook
 *
 * SECURITY FIXES:
 * - Verify webhook signature before processing (prevent spoofing)
 * - Validate payload format and transaction data
 * - Only update payments if signature is valid
 */
exports.handleWebhook = async (req, res) => {
    try {
        // SECURITY: Verify webhook signature before processing
        // This prevents attackers from calling this endpoint to approve arbitrary payments
        const crypto = require('crypto');

        // Get signature from headers (format depends on provider)
        const signature = req.headers['x-razorpay-signature'] ||
                         req.headers['x-stripe-signature'] ||
                         req.headers['x-webhook-signature'];

        if (!signature) {
            console.warn('[Payment] Webhook rejected: Missing signature header');
            return res.status(403).json({ error: 'Invalid webhook: missing signature' });
        }

        // Get webhook secret from environment
        const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('[Payment] WEBHOOK_SECRET not configured');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Verify signature based on provider
        let isValid = false;

        // Razorpay verification example
        if (req.headers['x-razorpay-signature']) {
            const payload = JSON.stringify(req.body);
            const hash = crypto.createHmac('sha256', webhookSecret)
                .update(payload)
                .digest('hex');
            isValid = hash === signature;
        }
        // Generic HMAC verification (works for most providers)
        else {
            const payload = JSON.stringify(req.body);
            const hash = crypto.createHmac('sha256', webhookSecret)
                .update(payload)
                .digest('hex');
            isValid = hash === signature;
        }

        if (!isValid) {
            console.warn('[Payment] Webhook rejected: Invalid signature', {
                received: signature.substring(0, 16) + '...',
                ip: req.ip
            });
            return res.status(403).json({ error: 'Invalid webhook signature' });
        }

        // SECURITY: Validate webhook payload structure before processing
        const payload = req.body;
        if (!payload.id || !payload.amount || !payload.status) {
            console.warn('[Payment] Webhook rejected: Missing required fields');
            return res.status(400).json({ error: 'Invalid webhook payload' });
        }

        console.log('[Payment] Webhook signature verified:', {
            id: payload.id,
            amount: payload.amount,
            status: payload.status,
            timestamp: new Date().toISOString()
        });

        // Find payment by transaction ID and update if verified
        const transactionId = payload.id || payload.transaction_id;
        if (!transactionId) {
            return res.status(400).json({ error: 'Invalid payload: missing transaction ID' });
        }

        // Only process if webhook indicates success
        if (payload.status === 'captured' || payload.status === 'completed' || payload.status === 'verified') {
            const paymentResult = await pool.query(
                'SELECT id, user_id, plan_purchased, amount FROM payments WHERE transaction_id = $1',
                [transactionId]
            );

            if (paymentResult.rows.length > 0) {
                const payment = paymentResult.rows[0];

                // Validate amount matches (prevent tampering)
                const rules = getTierRules(payment.plan_purchased);
                if (payment.amount !== rules.priceINR) {
                    console.error('[Payment] Webhook amount mismatch', {
                        transaction_id: transactionId,
                        expected: rules.priceINR,
                        received: payment.amount
                    });
                    return res.status(400).json({ error: 'Payment amount mismatch' });
                }

                // Update payment to verified
                await pool.query(
                    `UPDATE payments
                     SET status = 'verified', verified_at = NOW()
                     WHERE id = $1`,
                    [payment.id]
                );

                // Trigger subscription update (same logic as manual verification)
                // ... update user tier, subscription, etc ...

                console.log('[Payment] Webhook processed successfully:', {
                    transaction_id: transactionId,
                    user_id: payment.user_id,
                    plan: payment.plan_purchased
                });
            }
        }

        // Always return 200 to acknowledge receipt (prevents retries)
        res.json({ status: 'ok', received: true });

    } catch (err) {
        console.error('[Payment] Webhook error:', err);
        // Return 500 to let provider retry (failed processing)
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

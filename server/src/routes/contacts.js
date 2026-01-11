/**
 * Contacts Routes
 * Protocol: Native Hybrid - Contact Sync
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const pool = require('../config/db');

// All routes require authentication
router.use(protect);

/**
 * Sync contacts from device
 * POST /api/contacts/sync
 */
router.post('/sync', async (req, res) => {
    const userId = req.user?.userId;
    const { contacts } = req.body;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({ error: 'Contacts array required' });
    }

    try {
        let synced = 0;

        for (const contact of contacts) {
            if (!contact.phone || contact.phone.length !== 10) continue;

            // Upsert contact
            await pool.query(`
        INSERT INTO user_contacts (owner_id, name, phone, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (owner_id, phone) 
        DO UPDATE SET name = EXCLUDED.name
      `, [userId, contact.name || 'Unknown', contact.phone]);

            synced++;
        }

        // Check which contacts are on the platform
        await pool.query(`
      UPDATE user_contacts uc
      SET is_on_platform = TRUE, matched_user_id = u.user_id
      FROM users u
      WHERE uc.owner_id = $1
        AND (u.phone = uc.phone OR u.phone = CONCAT('+91', uc.phone))
        AND u.user_id != $1
    `, [userId]);

        res.json({
            message: 'Contacts synced',
            synced
        });

    } catch (error) {
        console.error('[Contacts] Sync error:', error);
        res.status(500).json({ error: 'Failed to sync contacts' });
    }
});

/**
 * Get friends on platform
 * GET /api/contacts/friends
 */
router.get('/friends', async (req, res) => {
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const result = await pool.query(`
      SELECT 
        uc.name as contact_name,
        uc.phone,
        u.user_id,
        u.username,
        p.avatar_url,
        p.full_name
      FROM user_contacts uc
      JOIN users u ON u.phone = uc.phone OR u.phone = CONCAT('+91', uc.phone)
      LEFT JOIN profiles p ON p.user_id = u.user_id
      WHERE uc.owner_id = $1
        AND u.user_id != $1
      ORDER BY uc.name
    `, [userId]);

        res.json({ friends: result.rows });

    } catch (error) {
        console.error('[Contacts] Find friends error:', error);
        res.status(500).json({ error: 'Failed to find friends' });
    }
});

/**
 * Get contact sync stats
 * GET /api/contacts/stats
 */
router.get('/stats', async (req, res) => {
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_contacts,
        COUNT(CASE WHEN is_on_platform THEN 1 END) as friends_on_platform
      FROM user_contacts
      WHERE owner_id = $1
    `, [userId]);

        res.json(stats.rows[0]);

    } catch (error) {
        console.error('[Contacts] Stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

module.exports = router;

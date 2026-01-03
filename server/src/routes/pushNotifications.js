const express = require('express');
const router = express.Router();
const fcm = require('../services/fcm');

/**
 * Register device token for push notifications
 * POST /api/push/register
 * Body: { token, deviceType, deviceName }
 */
router.post('/register', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || req.body.userId;
        const { token, deviceType = 'web', deviceName } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        if (!userId) {
            return res.status(401).json({ error: 'User ID is required' });
        }

        await fcm.registerToken(userId, token, deviceType, deviceName);
        res.json({ success: true, message: 'Device registered for push notifications' });
    } catch (error) {
        console.error('Error registering device:', error);
        res.status(500).json({ error: 'Failed to register device' });
    }
});

/**
 * Unregister device token (on logout)
 * DELETE /api/push/unregister
 * Body: { token }
 */
router.delete('/unregister', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        await fcm.unregisterToken(token);
        res.json({ success: true, message: 'Device unregistered' });
    } catch (error) {
        console.error('Error unregistering device:', error);
        res.status(500).json({ error: 'Failed to unregister device' });
    }
});

/**
 * Send push notification to a user (admin/internal use)
 * POST /api/push/send
 * Body: { userId, title, body, data }
 */
router.post('/send', async (req, res) => {
    try {
        const { userId, title, body, data } = req.body;

        if (!userId || !title || !body) {
            return res.status(400).json({ error: 'userId, title, and body are required' });
        }

        const result = await fcm.sendToUser(userId, title, body, data || {});
        res.json(result);
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

/**
 * Send push notification to all registered devices (broadcast)
 * POST /api/push/broadcast
 * Body: { title, body, data }
 */
router.post('/broadcast', async (req, res) => {
    try {
        const { title, body, data } = req.body;

        if (!title || !body) {
            return res.status(400).json({ error: 'title and body are required' });
        }

        // Get all active tokens
        const pool = require('../config/db');
        const result = await pool.query('SELECT token FROM device_tokens WHERE is_active = true');

        if (result.rows.length === 0) {
            return res.json({ success: false, reason: 'No registered devices' });
        }

        const tokens = result.rows.map(row => row.token);
        const sendResult = await fcm.sendToMultiple(tokens, title, body, data || {});
        res.json(sendResult);
    } catch (error) {
        console.error('Error broadcasting notification:', error);
        res.status(500).json({ error: 'Failed to broadcast notification' });
    }
});

module.exports = router;

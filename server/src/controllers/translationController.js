/**
 * Translation Worker Controller
 * Defender Prompt 5: Async Processing
 * 
 * Implements "Fire and Forget" pattern:
 * 1. User posts -> Text queued immediately
 * 2. CRON job processes 50 translations at a time
 * 3. No user waits for translation
 */

const pool = require('../config/db');

// Mock translation function (replace with actual API)
const translateText = async (text, sourceLang, targetLang) => {
    // In production, use Google Translate API, DeepL, or similar
    // For now, return a mock translation

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock translation (prefix with target language)
    return `[${targetLang.toUpperCase()}] ${text}`;
};

/**
 * Add text to translation queue
 * Called when a post is created
 */
const queueTranslation = async (postId, text, sourceLang = 'en', targetLang = 'hi') => {
    try {
        await pool.query(`
      INSERT INTO translation_queue (post_id, source_text, source_lang, target_lang, status, created_at)
      VALUES ($1, $2, $3, $4, 'pending', NOW())
      ON CONFLICT DO NOTHING
    `, [postId, text, sourceLang, targetLang]);

        console.log(`[Translation] Queued post ${postId} for translation`);
        return true;
    } catch (error) {
        console.error('[Translation] Queue error:', error);
        return false;
    }
};

/**
 * Process pending translations
 * Called by CRON job endpoint
 * Processes in batches of 50 to avoid timeout
 */
const processTranslations = async (req, res) => {
    const BATCH_SIZE = 50;
    const MAX_RETRIES = 3;

    try {
        // Get pending translations
        const pending = await pool.query(`
      SELECT queue_id, post_id, source_text, source_lang, target_lang, retry_count
      FROM translation_queue
      WHERE status = 'pending' AND retry_count < $1
      ORDER BY created_at ASC
      LIMIT $2
    `, [MAX_RETRIES, BATCH_SIZE]);

        if (pending.rows.length === 0) {
            return res.json({ message: 'No pending translations', processed: 0 });
        }

        console.log(`[Translation] Processing ${pending.rows.length} items`);

        let successCount = 0;
        let failCount = 0;

        // Mark as processing
        const queueIds = pending.rows.map(r => r.queue_id);
        await pool.query(`
      UPDATE translation_queue SET status = 'processing' WHERE queue_id = ANY($1)
    `, [queueIds]);

        // Process each translation
        for (const item of pending.rows) {
            try {
                const translated = await translateText(
                    item.source_text,
                    item.source_lang,
                    item.target_lang
                );

                // Update queue with result
                await pool.query(`
          UPDATE translation_queue 
          SET status = 'completed', translated_text = $1, processed_at = NOW()
          WHERE queue_id = $2
        `, [translated, item.queue_id]);

                // Update the post with translated text (if applicable)
                await pool.query(`
          UPDATE posts 
          SET translated_title = $1 
          WHERE post_id = $2
        `, [translated, item.post_id]);

                successCount++;

            } catch (err) {
                console.error(`[Translation] Failed for queue ${item.queue_id}:`, err);

                // Mark as pending with increased retry count
                await pool.query(`
          UPDATE translation_queue 
          SET status = 'pending', retry_count = retry_count + 1
          WHERE queue_id = $1
        `, [item.queue_id]);

                failCount++;
            }
        }

        console.log(`[Translation] Completed: ${successCount} success, ${failCount} failed`);

        res.json({
            message: 'Translation batch processed',
            processed: successCount,
            failed: failCount,
            total: pending.rows.length
        });

    } catch (error) {
        console.error('[Translation] Process error:', error);
        res.status(500).json({ error: 'Translation processing failed' });
    }
};

/**
 * Get translation status for a post
 */
const getTranslationStatus = async (req, res) => {
    const { postId } = req.params;

    try {
        const result = await pool.query(`
      SELECT status, translated_text, processed_at
      FROM translation_queue
      WHERE post_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [postId]);

        if (result.rows.length === 0) {
            return res.json({ status: 'not_queued' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('[Translation] Status error:', error);
        res.status(500).json({ error: 'Failed to get status' });
    }
};

/**
 * Get queue statistics
 */
const getQueueStats = async (req, res) => {
    try {
        const stats = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM translation_queue
      GROUP BY status
    `);

        const pending = await pool.query(`
      SELECT COUNT(*) as count FROM translation_queue WHERE status = 'pending'
    `);

        res.json({
            stats: stats.rows,
            pendingCount: parseInt(pending.rows[0]?.count || 0)
        });

    } catch (error) {
        console.error('[Translation] Stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
};

module.exports = {
    queueTranslation,
    processTranslations,
    getTranslationStatus,
    getQueueStats
};

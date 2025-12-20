/**
 * Saved Searches Controller
 * Save search criteria and get alerts on matching posts
 */

const pool = require('../config/db');

// Save a search
const saveSearch = async (req, res) => {
    const userId = req.user?.userId;
    const { name, searchQuery, categoryId, location, minPrice, maxPrice, keywords } = req.body;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const result = await pool.query(`
      INSERT INTO saved_searches (user_id, name, search_query, category_id, location, min_price, max_price, keywords)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [userId, name, searchQuery, categoryId, location, minPrice, maxPrice, keywords]);

        res.status(201).json({
            message: 'Search saved',
            search: result.rows[0]
        });
    } catch (error) {
        console.error('Save search error:', error);
        res.status(500).json({ error: 'Failed to save search' });
    }
};

// Get saved searches for user
const getSavedSearches = async (req, res) => {
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const result = await pool.query(`
      SELECT ss.*, c.name as category_name
      FROM saved_searches ss
      LEFT JOIN categories c ON c.category_id = ss.category_id
      WHERE ss.user_id = $1
      ORDER BY ss.created_at DESC
    `, [userId]);

        res.json({ searches: result.rows });
    } catch (error) {
        console.error('Get saved searches error:', error);
        res.status(500).json({ error: 'Failed to fetch saved searches' });
    }
};

// Get matching posts for a saved search
const getMatchingPosts = async (req, res) => {
    const userId = req.user?.userId;
    const { searchId } = req.params;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        // Get saved search
        const searchResult = await pool.query(
            'SELECT * FROM saved_searches WHERE search_id = $1 AND user_id = $2',
            [searchId, userId]
        );

        if (searchResult.rows.length === 0) {
            return res.status(404).json({ error: 'Saved search not found' });
        }

        const search = searchResult.rows[0];

        // Build dynamic query
        let query = `
      SELECT p.*, c.name as category_name, u.username as seller_name
      FROM posts p
      LEFT JOIN categories c ON c.category_id = p.category_id
      LEFT JOIN users u ON u.user_id = p.user_id
      WHERE p.status = 'active'
    `;
        const params = [];
        let paramIndex = 1;

        if (search.category_id) {
            query += ` AND p.category_id = $${paramIndex}`;
            params.push(search.category_id);
            paramIndex++;
        }

        if (search.location) {
            query += ` AND LOWER(p.location) LIKE LOWER($${paramIndex})`;
            params.push(`%${search.location}%`);
            paramIndex++;
        }

        if (search.min_price) {
            query += ` AND p.price >= $${paramIndex}`;
            params.push(search.min_price);
            paramIndex++;
        }

        if (search.max_price) {
            query += ` AND p.price <= $${paramIndex}`;
            params.push(search.max_price);
            paramIndex++;
        }

        if (search.keywords && search.keywords.length > 0) {
            const keywordConditions = search.keywords.map((_, i) =>
                `(LOWER(p.title) LIKE LOWER($${paramIndex + i}) OR LOWER(p.description) LIKE LOWER($${paramIndex + i}))`
            ).join(' OR ');
            query += ` AND (${keywordConditions})`;
            search.keywords.forEach(k => params.push(`%${k}%`));
        }

        query += ` ORDER BY p.created_at DESC LIMIT 50`;

        const result = await pool.query(query, params);

        res.json({
            search: search,
            posts: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Get matching posts error:', error);
        res.status(500).json({ error: 'Failed to fetch matching posts' });
    }
};

// Delete a saved search
const deleteSearch = async (req, res) => {
    const userId = req.user?.userId;
    const { searchId } = req.params;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const result = await pool.query(
            'DELETE FROM saved_searches WHERE search_id = $1 AND user_id = $2 RETURNING *',
            [searchId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Search not found' });
        }

        res.json({ message: 'Search deleted' });
    } catch (error) {
        console.error('Delete search error:', error);
        res.status(500).json({ error: 'Failed to delete search' });
    }
};

// Toggle notifications for a saved search
const toggleNotifications = async (req, res) => {
    const userId = req.user?.userId;
    const { searchId } = req.params;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const result = await pool.query(`
      UPDATE saved_searches 
      SET notify_enabled = NOT notify_enabled
      WHERE search_id = $1 AND user_id = $2
      RETURNING *
    `, [searchId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Search not found' });
        }

        res.json({
            message: `Notifications ${result.rows[0].notify_enabled ? 'enabled' : 'disabled'}`,
            search: result.rows[0]
        });
    } catch (error) {
        console.error('Toggle notifications error:', error);
        res.status(500).json({ error: 'Failed to toggle notifications' });
    }
};

module.exports = {
    saveSearch,
    getSavedSearches,
    getMatchingPosts,
    deleteSearch,
    toggleNotifications
};

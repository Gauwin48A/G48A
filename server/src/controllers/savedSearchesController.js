/**
 * Saved Searches Controller
 * Save search criteria and get alerts on matching posts
 */

const pool = require('../config/db');
const logger = require('../utils/logger');
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

let savedSearchesSchemaConfigPromise = null;

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

function normalizeNullableString(value) {
    if (value === undefined || value === null) {
        return null;
    }
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function parseNullableInteger(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableFloat(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeKeywords(keywords) {
    if (Array.isArray(keywords)) {
        const cleaned = keywords
            .map((keyword) => normalizeNullableString(keyword))
            .filter(Boolean);
        return cleaned.length > 0 ? cleaned : null;
    }

    if (typeof keywords === 'string') {
        const cleaned = keywords
            .split(',')
            .map((keyword) => normalizeNullableString(keyword))
            .filter(Boolean);
        return cleaned.length > 0 ? cleaned : null;
    }

    return null;
}

function parseBoolean(value, fallback = null) {
    if (value === undefined || value === null) return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return fallback;
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

function getUserId(req) {
    return req.user?.userId || req.user?.id || req.user?.user_id || null;
}

async function getSavedSearchesSchemaConfig() {
    if (!savedSearchesSchemaConfigPromise) {
        savedSearchesSchemaConfigPromise = runQuery(
            `
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'saved_searches'
            `
        )
            .then((result) => {
                const columns = new Set((result?.rows || []).map((row) => row.column_name));
                const config = {
                    nameColumn: columns.has('search_name') ? 'search_name' : columns.has('name') ? 'name' : null,
                    notificationColumn: columns.has('notification_enabled')
                        ? 'notification_enabled'
                        : columns.has('notify_enabled')
                            ? 'notify_enabled'
                            : null,
                    hasKeywordsColumn: columns.has('keywords'),
                    hasFiltersColumn: columns.has('filters'),
                    hasUpdatedAtColumn: columns.has('updated_at')
                };

                if (!config.nameColumn) {
                    logger.warn('[SavedSearches] name/search_name column missing');
                }
                if (!config.notificationColumn) {
                    logger.warn('[SavedSearches] notification_enabled/notify_enabled column missing');
                }

                return config;
            })
            .catch((error) => {
                logger.warn('[SavedSearches] Schema inspection failed; using defaults', { message: error.message });
                return {
                    nameColumn: 'search_name',
                    notificationColumn: 'notification_enabled',
                    hasKeywordsColumn: false,
                    hasFiltersColumn: true,
                    hasUpdatedAtColumn: true
                };
            });
    }

    return savedSearchesSchemaConfigPromise;
}

function getKeywordsSelectExpression(config, tableAlias = '') {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    if (config.hasKeywordsColumn) {
        return `${prefix}keywords`;
    }
    if (config.hasFiltersColumn) {
        return `COALESCE(${prefix}filters->'keywords', '[]'::jsonb) AS keywords`;
    }
    return `'[]'::jsonb AS keywords`;
}

function getNotificationSelectExpression(config, tableAlias = '') {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    if (config.notificationColumn) {
        return `${prefix}${config.notificationColumn} AS notification_enabled`;
    }
    return 'false AS notification_enabled';
}

function getUpdatedAtSelectExpression(config, tableAlias = '') {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    return config.hasUpdatedAtColumn ? `${prefix}updated_at` : `${prefix}created_at AS updated_at`;
}

// Save a search
const saveSearch = async (req, res) => {
    const userId = getUserId(req);
    const { name, searchQuery, categoryId, location, minPrice, maxPrice, keywords } = req.body;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const schemaConfig = await getSavedSearchesSchemaConfig();
        if (!schemaConfig.nameColumn) {
            return res.status(503).json({ error: 'Saved searches schema unavailable' });
        }

        const normalizedName = normalizeNullableString(name);
        const normalizedSearchQuery = normalizeNullableString(searchQuery);
        if (!normalizedName || !normalizedSearchQuery) {
            return res.status(400).json({ error: 'name and searchQuery are required' });
        }

        const normalizedKeywords = normalizeKeywords(keywords);
        const insertColumns = [
            'user_id',
            schemaConfig.nameColumn,
            'search_query',
            'category_id',
            'location',
            'min_price',
            'max_price'
        ];
        const values = [
            String(userId),
            normalizedName,
            normalizedSearchQuery,
            parseNullableInteger(categoryId),
            normalizeNullableString(location),
            parseNullableFloat(minPrice),
            parseNullableFloat(maxPrice)
        ];

        if (schemaConfig.hasKeywordsColumn) {
            insertColumns.push('keywords');
            values.push(normalizedKeywords);
        }

        if (schemaConfig.hasFiltersColumn) {
            insertColumns.push('filters');
            values.push(JSON.stringify({ keywords: normalizedKeywords || [] }));
        }

        const requestedNotificationEnabled = parseBoolean(
            req.body.notificationEnabled ?? req.body.notify_enabled,
            null
        );
        if (schemaConfig.notificationColumn && requestedNotificationEnabled !== null) {
            insertColumns.push(schemaConfig.notificationColumn);
            values.push(requestedNotificationEnabled);
        }

        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
        const result = await runQuery(
            `
                INSERT INTO saved_searches (${insertColumns.join(', ')})
                VALUES (${placeholders})
                RETURNING
                    search_id,
                    user_id,
                    ${schemaConfig.nameColumn} AS name,
                    search_query,
                    category_id,
                    location,
                    min_price,
                    max_price,
                    ${getKeywordsSelectExpression(schemaConfig)},
                    ${getNotificationSelectExpression(schemaConfig)},
                    created_at,
                    ${getUpdatedAtSelectExpression(schemaConfig)}
            `,
            values
        );

        res.status(201).json({
            message: 'Search saved',
            search: result.rows[0]
        });
    } catch (error) {
        logger.error('Save search error:', error);
        res.status(500).json({ error: 'Failed to save search' });
    }
};

// Get saved searches for user
const getSavedSearches = async (req, res) => {
    const userId = getUserId(req);

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const schemaConfig = await getSavedSearchesSchemaConfig();
        if (!schemaConfig.nameColumn) {
            return res.status(503).json({ error: 'Saved searches schema unavailable' });
        }

        const result = await runQuery(
            `
                SELECT
                    ss.search_id,
                    ss.user_id,
                    ss.${schemaConfig.nameColumn} AS name,
                    ss.search_query,
                    ss.category_id,
                    ss.location,
                    ss.min_price,
                    ss.max_price,
                    ${getKeywordsSelectExpression(schemaConfig, 'ss')},
                    ${getNotificationSelectExpression(schemaConfig, 'ss')},
                    ss.created_at,
                    ${getUpdatedAtSelectExpression(schemaConfig, 'ss')},
                    c.name as category_name
                FROM saved_searches ss
                LEFT JOIN categories c ON c.category_id::text = ss.category_id::text
                WHERE ss.user_id::text = $1
                ORDER BY ss.created_at DESC
            `,
            [String(userId)]
        );

        res.json({ searches: result.rows });
    } catch (error) {
        logger.error('Get saved searches error:', error);
        res.status(500).json({ error: 'Failed to fetch saved searches' });
    }
};

// Get matching posts for a saved search
const getMatchingPosts = async (req, res) => {
    const userId = getUserId(req);
    const { searchId } = req.params;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const schemaConfig = await getSavedSearchesSchemaConfig();
        if (!schemaConfig.nameColumn) {
            return res.status(503).json({ error: 'Saved searches schema unavailable' });
        }

        // Get saved search
        const searchResult = await runQuery(
            `
                SELECT
                    search_id,
                    ${schemaConfig.nameColumn} AS name,
                    search_query,
                    category_id,
                    location,
                    min_price,
                    max_price,
                    ${getKeywordsSelectExpression(schemaConfig)}
                FROM saved_searches
                WHERE search_id = $1 AND user_id::text = $2
            `,
            [searchId, String(userId)]
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
            paramIndex += 1;
        }

        if (search.location) {
            query += ` AND LOWER(p.location) LIKE LOWER($${paramIndex})`;
            params.push(`%${search.location}%`);
            paramIndex += 1;
        }

        if (search.min_price) {
            query += ` AND p.price >= $${paramIndex}`;
            params.push(search.min_price);
            paramIndex += 1;
        }

        if (search.max_price) {
            query += ` AND p.price <= $${paramIndex}`;
            params.push(search.max_price);
            paramIndex += 1;
        }

        const keywordList = Array.isArray(search.keywords)
            ? search.keywords
            : normalizeKeywords(search.keywords) || [];
        if (keywordList.length > 0) {
            query += ` AND (
                LOWER(p.title) LIKE ANY($${paramIndex}::text[])
                OR LOWER(p.description) LIKE ANY($${paramIndex}::text[])
                OR LOWER(c.name) LIKE ANY($${paramIndex}::text[])
            )`;
            params.push(keywordList.map((keyword) => `%${String(keyword).toLowerCase()}%`));
            paramIndex += 1;
        }

        query += ` ORDER BY p.created_at DESC LIMIT 50`;

        const result = await runQuery(query, params);

        res.json({
            search,
            posts: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        logger.error('Get matching posts error:', error);
        res.status(500).json({ error: 'Failed to fetch matching posts' });
    }
};

// Delete a saved search
const deleteSearch = async (req, res) => {
    const userId = getUserId(req);
    const { searchId } = req.params;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const result = await runQuery(
            `
                DELETE FROM saved_searches
                WHERE search_id = $1 AND user_id::text = $2
                RETURNING search_id
            `,
            [searchId, String(userId)]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Search not found' });
        }

        res.json({ message: 'Search deleted' });
    } catch (error) {
        logger.error('Delete search error:', error);
        res.status(500).json({ error: 'Failed to delete search' });
    }
};

// Toggle notifications for a saved search
const toggleNotifications = async (req, res) => {
    const userId = getUserId(req);
    const { searchId } = req.params;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const schemaConfig = await getSavedSearchesSchemaConfig();
        if (!schemaConfig.nameColumn) {
            return res.status(503).json({ error: 'Saved searches schema unavailable' });
        }
        if (!schemaConfig.notificationColumn) {
            return res.status(503).json({ error: 'Saved search notifications unavailable' });
        }

        const result = await runQuery(
            `
                UPDATE saved_searches
                SET ${schemaConfig.notificationColumn} = NOT COALESCE(${schemaConfig.notificationColumn}, false)
                WHERE search_id = $1 AND user_id::text = $2
                RETURNING
                    search_id,
                    user_id,
                    ${schemaConfig.nameColumn} AS name,
                    search_query,
                    category_id,
                    location,
                    min_price,
                    max_price,
                    ${getKeywordsSelectExpression(schemaConfig)},
                    ${getNotificationSelectExpression(schemaConfig)},
                    created_at,
                    ${getUpdatedAtSelectExpression(schemaConfig)}
            `,
            [searchId, String(userId)]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Search not found' });
        }

        res.json({
            message: `Notifications ${result.rows[0].notification_enabled ? 'enabled' : 'disabled'}`,
            search: result.rows[0]
        });
    } catch (error) {
        logger.error('Toggle notifications error:', error);
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

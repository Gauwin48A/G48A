import { translateText } from '../services/translateService.js';
import db from '../db.js';
import Queue from 'bullmq';

// --- SQL Injection Prevention: strict whitelists ---
const ALLOWED_ENTITY_TYPES = new Set(['post', 'user', 'category', 'subcategory', 'profile']);
const ALLOWED_FIELDS = new Set(['title', 'description', 'name', 'body', 'bio', 'location']);

function validateIdentifier(value, allowedSet, label) {
  const v = String(value).toLowerCase().trim();
  if (!allowedSet.has(v)) {
    throw new Error(`[translationWorker] Invalid ${label}: "${value}". Allowed: ${[...allowedSet].join(', ')}`);
  }
  return v;
}

const translationQueue = new Queue('translation', { connection: { host: 'localhost', port: 6379 } });

translationQueue.process(async job => {
  const { entity_type, entity_id, fields, sourceLang, targetLang } = job.data;
  const safeEntityType = validateIdentifier(entity_type, ALLOWED_ENTITY_TYPES, 'entity_type');
  for (const field of fields) {
    const safeField = validateIdentifier(field, ALLOWED_FIELDS, 'field');
    const baseRow = await db.query(
      `SELECT ${safeField} FROM ${safeEntityType}s WHERE ${safeEntityType}_id = $1`, [entity_id]
    );
    const baseValue = baseRow.rows[0][safeField];
    const translated = await translateText(baseValue, targetLang);
    await db.query(
      `INSERT INTO translations (entity_type, entity_id, field, language, value)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (entity_type, entity_id, field, language) DO UPDATE SET value = $5, updated_at = NOW()`,
      [safeEntityType, entity_id, safeField, targetLang, translated]
    );
  }
});
export default translationQueue;

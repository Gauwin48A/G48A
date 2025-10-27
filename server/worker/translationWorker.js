import { translateText } from '../services/translateService.js';
import db from '../db.js';
import Queue from 'bullmq';

const translationQueue = new Queue('translation', { connection: { host: 'localhost', port: 6379 } });

translationQueue.process(async job => {
  const { entity_type, entity_id, fields, sourceLang, targetLang } = job.data;
  for (const field of fields) {
    const baseRow = await db.query(
      `SELECT ${field} FROM ${entity_type}s WHERE ${entity_type}_id = $1`, [entity_id]
    );
    const baseValue = baseRow.rows[0][field];
    const translated = await translateText(baseValue, targetLang);
    await db.query(
      `INSERT INTO translations (entity_type, entity_id, field, language, value)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (entity_type, entity_id, field, language) DO UPDATE SET value = $5, updated_at = NOW()`,
      [entity_type, entity_id, field, targetLang, translated]
    );
  }
});
export default translationQueue;

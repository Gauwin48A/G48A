import express from 'express';
import db from '../db.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const { entity_type, entity_id } = req.query;
  const rows = await db.query(
    `SELECT * FROM translations WHERE entity_type=$1 AND entity_id=$2`, [entity_type, entity_id]
  );
  res.json(rows.rows);
});

router.put('/:id', async (req, res) => {
  const { value } = req.body;
  await db.query(
    `UPDATE translations SET value=$1, updated_at=NOW() WHERE id=$2`, [value, req.params.id]
  );
  res.json({ success: true });
});
export default router;

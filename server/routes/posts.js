import express from 'express';
import db from '../db.js';
import { translateText } from '../services/translateService.js';
import translationQueue from '../worker/translationWorker.js';
const router = express.Router();

const supportedLangs = ['en','hi','te','mr','ta','kn'];

router.post('/', async (req, res) => {
  const { title, description, user_id } = req.body;
  const post = await db.query(
    `INSERT INTO posts (user_id, title, description, base_language)
     VALUES ($1, $2, $3, 'en') RETURNING *;`, 
    [user_id, title, description]
  );
  for (const lang of supportedLangs) {
    if (lang !== 'en') {
      translationQueue.add('translate_entity', {
        entity_type: 'post',
        entity_id: post.rows[0].post_id,
        fields: ['title', 'description'],
        sourceLang: 'en',
        targetLang: lang
      });
    }
  }
  res.status(201).json(post.rows[0]);
});

router.get('/', async (req, res) => {
  const lang = req.lang || 'en';
  const posts = await db.query('SELECT * FROM posts ORDER BY post_id DESC');
  const localizedPosts = await Promise.all(posts.rows.map(async (p) => {
    const titleTr = await db.query(
      `SELECT value FROM translations WHERE entity_type='post' AND entity_id=$1 AND field='title' AND language=$2;`,
      [p.post_id, lang]
    );
    const descTr = await db.query(
      `SELECT value FROM translations WHERE entity_type='post' AND entity_id=$1 AND field='description' AND language=$2;`,
      [p.post_id, lang]
    );
    return {
      ...p,
      title: titleTr.rows[0]?.value || p.title,
      description: descTr.rows[0]?.value || p.description,
      lang,
      translations_missing: !(titleTr.rows[0] && descTr.rows[0])
    };
  }));
  res.json(localizedPosts);
});

router.get('/mine', async (req, res) => {
  const lang = req.lang || 'en';
  const user_id = req.user?.id || req.query.user_id;
  const posts = await db.query('SELECT * FROM posts WHERE user_id=$1 ORDER BY post_id DESC', [user_id]);
  // ...same translation logic as above...
});

export default router;

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { HonoEnv } from '../types';
import { requireAuth, rateLimit } from '../middleware';

export const wishlistRoutes = new Hono<HonoEnv>();

wishlistRoutes.get('/', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const rows = await c.env.DB.prepare(
    `SELECT p.id, p.title, p.price, p.currency, p.image_urls, p.location, p.created_at,
            c.name AS category_name
     FROM wishlist w
     JOIN posts p ON p.id = w.post_id AND p.status = 'published'
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE w.user_id = ?1
     ORDER BY w.created_at DESC
     LIMIT 200`,
  )
    .bind(auth.userId)
    .all();
  const posts = (rows.results ?? []).map((r: any) => {
    let images: string[] = [];
    try { images = r.image_urls ? JSON.parse(r.image_urls) : []; } catch {}
    return {
      id: r.id,
      title: r.title,
      price: r.price,
      currency: r.currency,
      image_url: images[0] ?? null,
      images,
      location: r.location,
      category_name: r.category_name,
      created_at: r.created_at,
    };
  });
  return c.json({ posts });
});

wishlistRoutes.post(
  '/:postId',
  requireAuth,
  rateLimit({ bucket: 'wishlist_write', max: 200, windowSeconds: 3600 }),
  async (c) => {
    const auth = c.get('auth')!;
    const postId = c.req.param('postId');
    const exists = await c.env.DB.prepare(`SELECT 1 FROM posts WHERE id = ?1 AND status = 'published'`)
      .bind(postId).first();
    if (!exists) throw new HTTPException(404, { message: 'Post not found' });

    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO wishlist (user_id, post_id) VALUES (?1, ?2)`,
    ).bind(auth.userId, postId).run();
    return c.json({ success: true });
  },
);

wishlistRoutes.delete('/:postId', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const postId = c.req.param('postId');
  await c.env.DB.prepare(`DELETE FROM wishlist WHERE user_id = ?1 AND post_id = ?2`)
    .bind(auth.userId, postId).run();
  return c.json({ success: true });
});

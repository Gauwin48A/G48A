import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { nanoid } from 'nanoid';
import type { HonoEnv } from '../types';
import { optionalAuth, requireAuth, requireSeller, rateLimit } from '../middleware';

export const postRoutes = new Hono<HonoEnv>();

// ---- Row -> DTO helper (parses image_urls JSON once) ----
function toPost(row: Record<string, any>) {
  let images: string[] = [];
  try {
    images = row.image_urls ? JSON.parse(row.image_urls) : [];
  } catch {
    images = [];
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: row.price,
    currency: row.currency,
    location: row.location,
    image_url: images[0] ?? null,
    images,
    category_id: row.category_id,
    category_name: row.category_name ?? null,
    user_id: row.user_id,
    user_name: row.user_name ?? null,
    status: row.status,
    view_count: row.view_count,
    created_at: row.created_at,
  };
}

/** GET /api/posts?page=1&limit=20&category=<id>&q=<search> */
postRoutes.get('/', optionalAuth, async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));
  const offset = (page - 1) * limit;
  const category = c.req.query('category')?.trim();
  const q = c.req.query('q')?.trim();

  let sql: string;
  let binds: any[];

  if (q) {
    // FTS5 search
    sql = `SELECT p.*, c.name AS category_name, u.full_name AS user_name
           FROM posts_fts f
           JOIN posts p ON p.rowid = f.rowid
           LEFT JOIN categories c ON c.id = p.category_id
           LEFT JOIN users u ON u.id = p.user_id
           WHERE posts_fts MATCH ?1
             AND p.status = 'published'
             ${category ? 'AND p.category_id = ?2' : ''}
           ORDER BY p.created_at DESC
           LIMIT ?${category ? '3' : '2'} OFFSET ?${category ? '4' : '3'}`;
    binds = category ? [q, category, limit, offset] : [q, limit, offset];
  } else {
    sql = `SELECT p.*, c.name AS category_name, u.full_name AS user_name
           FROM posts p
           LEFT JOIN categories c ON c.id = p.category_id
           LEFT JOIN users u ON u.id = p.user_id
           WHERE p.status = 'published'
             ${category ? 'AND p.category_id = ?1' : ''}
           ORDER BY p.created_at DESC
           LIMIT ?${category ? '2' : '1'} OFFSET ?${category ? '3' : '2'}`;
    binds = category ? [category, limit, offset] : [limit, offset];
  }

  const rows = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ posts: (rows.results ?? []).map(toPost), page, limit });
});

/** GET /api/posts/:id */
postRoutes.get('/:id', optionalAuth, async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(
    `SELECT p.*, c.name AS category_name, u.full_name AS user_name
     FROM posts p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.id = ?1 AND p.status = 'published'`,
  )
    .bind(id)
    .first();
  if (!row) throw new HTTPException(404, { message: 'Post not found' });

  // fire-and-forget view count bump
  c.env.DB.prepare(`UPDATE posts SET view_count = view_count + 1 WHERE id = ?1`)
    .bind(id)
    .run()
    .catch(() => {});

  return c.json(toPost(row));
});

/** POST /api/posts — sellers only (KYC-verified). */
postRoutes.post(
  '/',
  requireAuth,
  requireSeller,
  rateLimit({ bucket: 'post_create', max: 20, windowSeconds: 3600 }),
  async (c) => {
    const auth = c.get('auth')!;
    type CreatePostBody = {
      title?: string;
      description?: string;
      price?: number;
      currency?: string;
      location?: string;
      category_id?: string;
      images?: string[];
    };
    const body = (await c.req.json().catch(() => ({}))) as CreatePostBody;

    const title = body.title?.trim();
    if (!title || title.length < 3 || title.length > 140) {
      throw new HTTPException(400, { message: 'Title must be 3–140 characters' });
    }
    const description = body.description?.trim().slice(0, 4000) || null;
    const price = typeof body.price === 'number' && body.price >= 0 ? body.price : null;
    const currency = (body.currency && body.currency.length <= 5 ? body.currency : 'INR') || 'INR';
    const location = body.location?.trim().slice(0, 200) || null;
    const categoryId = body.category_id?.trim() || null;

    // Validate images: must be previously-uploaded keys under our R2 public host
    const images: string[] = Array.isArray(body.images)
      ? body.images
          .filter((u: unknown): u is string => typeof u === 'string')
          .slice(0, 8)
          .filter((u: string) => u.startsWith(c.env.PUBLIC_MEDIA_HOST))
      : [];

    const id = `p_${nanoid(16)}`;
    await c.env.DB.prepare(
      `INSERT INTO posts (id, user_id, category_id, title, description, price, currency, location, image_urls)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    )
      .bind(id, auth.userId, categoryId, title, description, price, currency, location, JSON.stringify(images))
      .run();

    return c.json({ success: true, id }, 201);
  },
);

/** GET /api/posts/mine */
postRoutes.get('/mine/list', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const rows = await c.env.DB.prepare(
    `SELECT p.*, c.name AS category_name
     FROM posts p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.user_id = ?1 ORDER BY p.created_at DESC LIMIT 100`,
  )
    .bind(auth.userId)
    .all();
  return c.json({ posts: (rows.results ?? []).map(toPost) });
});

/** DELETE /api/posts/:id — owner only. Soft-delete. */
postRoutes.delete('/:id', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const id = c.req.param('id');
  const res = await c.env.DB.prepare(
    `UPDATE posts SET status = 'removed', updated_at = datetime('now')
     WHERE id = ?1 AND user_id = ?2`,
  )
    .bind(id, auth.userId)
    .run();
  if ((res.meta as any)?.changes === 0) {
    throw new HTTPException(404, { message: 'Post not found or not yours' });
  }
  return c.json({ success: true });
});

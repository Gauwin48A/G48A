import { Hono } from 'hono';
import type { HonoEnv } from '../types';

export const categoryRoutes = new Hono<HonoEnv>();

categoryRoutes.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT id, name, slug, icon_url FROM categories WHERE is_active = 1 ORDER BY sort_order, name`,
  ).all();
  return c.json({ categories: rows.results ?? [] });
});

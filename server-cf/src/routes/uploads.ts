import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { nanoid } from 'nanoid';
import type { HonoEnv } from '../types';
import { requireAuth, requireSeller, rateLimit } from '../middleware';

export const uploadRoutes = new Hono<HonoEnv>();

/**
 * POST /api/uploads/post-image
 * Sellers upload raw image bytes; we store in R2 and return the public URL.
 *
 * Workers R2 binding doesn't expose S3-style presigned URLs directly, so we use
 * the simpler and secure approach: stream-upload through the Worker.
 * For images < 10 MB this is well within free limits.
 */
uploadRoutes.post(
  '/post-image',
  requireAuth,
  requireSeller,
  rateLimit({ bucket: 'upload', max: 60, windowSeconds: 3600 }),
  async (c) => {
    const auth = c.get('auth')!;
    const contentType = c.req.header('Content-Type') || 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      throw new HTTPException(400, { message: 'Content-Type must be image/*' });
    }

    const body = await c.req.arrayBuffer();
    const MAX = 10 * 1024 * 1024;
    if (body.byteLength > MAX) {
      throw new HTTPException(413, { message: 'Image too large (max 10 MB)' });
    }
    if (body.byteLength < 100) {
      throw new HTTPException(400, { message: 'Image too small' });
    }

    const ext = extFromContentType(contentType);
    const key = `posts/${auth.userId}/${Date.now()}_${nanoid(8)}${ext}`;

    await c.env.MEDIA.put(key, body, {
      httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
      customMetadata: { uploaderId: auth.userId },
    });

    const url = `${c.env.PUBLIC_MEDIA_HOST}/${key}`;
    return c.json({ url, key, size: body.byteLength });
  },
);

function extFromContentType(ct: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
  };
  return map[ct.toLowerCase()] || '.bin';
}

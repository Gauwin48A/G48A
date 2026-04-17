import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { HTTPException } from 'hono/http-exception';
import type { HonoEnv } from './types';
import { optionalAuth } from './middleware';
import { authRoutes } from './routes/auth';
import { categoryRoutes } from './routes/categories';
import { postRoutes } from './routes/posts';
import { uploadRoutes } from './routes/uploads';
import { wishlistRoutes } from './routes/wishlist';
import { kycRoutes } from './routes/kyc';

const app = new Hono<HonoEnv>();

// Global middleware ----------------------------------------------------------
app.use('*', async (c, next) => {
  // Dynamic CORS: env var can be "*" or a CSV of origins.
  const origins = (c.env.CORS_ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim());
  const allow: string | ((o: string) => string | null) =
    origins.includes('*')
      ? '*'
      : (origin) => (origins.includes(origin) ? origin : null);
  return cors({
    origin: allow as any,
    allowHeaders: ['Authorization', 'Content-Type', 'X-Admin-Key'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    maxAge: 600,
  })(c, next);
});

app.use('*', secureHeaders());
app.use('*', logger());
app.use('/api/*', optionalAuth);

// Health ---------------------------------------------------------------------
app.get('/', (c) => c.json({ name: 'mhub-api', env: c.env.ENV }));
app.get('/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }));

// Mount routes ---------------------------------------------------------------
app.route('/api/auth', authRoutes);
app.route('/api/categories', categoryRoutes);
app.route('/api/posts', postRoutes);
app.route('/api/uploads', uploadRoutes);
app.route('/api/wishlist', wishlistRoutes);
app.route('/api/kyc', kycRoutes);

// Errors ---------------------------------------------------------------------
app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;

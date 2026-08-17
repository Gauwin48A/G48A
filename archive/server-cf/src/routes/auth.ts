import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { nanoid } from 'nanoid';
import type { HonoEnv } from '../types';
import { verifyGoogleIdToken, issueAppJwt } from '../jwt';
import { requireAuth, rateLimit } from '../middleware';

export const authRoutes = new Hono<HonoEnv>();

/**
 * POST /api/auth/google
 * Body: { idToken: string }
 * Verifies Google ID token, upserts user, issues app JWT.
 */
authRoutes.post(
  '/google',
  rateLimit({ bucket: 'auth_google', max: 10, windowSeconds: 60 }),
  async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { idToken?: string };
    const idToken = body.idToken?.trim();
    if (!idToken) throw new HTTPException(400, { message: 'idToken is required' });

    const audience = c.env.GOOGLE_OAUTH_AUDIENCE;
    if (!audience || audience.includes('REPLACE')) {
      throw new HTTPException(500, {
        message: 'Server misconfigured: GOOGLE_OAUTH_AUDIENCE not set',
      });
    }

    let claims;
    try {
      claims = await verifyGoogleIdToken(idToken, audience);
    } catch (e) {
      throw new HTTPException(401, { message: 'Invalid Google ID token' });
    }
    if (!claims.email_verified) {
      throw new HTTPException(403, { message: 'Google email not verified' });
    }

    // Upsert user by google_sub
    const existing = await c.env.DB.prepare(
      'SELECT id, email, role, kyc_status FROM users WHERE google_sub = ?1 LIMIT 1',
    )
      .bind(claims.sub)
      .first<{ id: string; email: string; role: string; kyc_status: string }>();

    let userId: string;
    let role: 'viewer' | 'seller' | 'admin';
    let kyc: 'none' | 'pending' | 'verified' | 'rejected';

    if (existing) {
      userId = existing.id;
      role = existing.role as typeof role;
      kyc = existing.kyc_status as typeof kyc;
      await c.env.DB.prepare(
        `UPDATE users SET last_seen_at = datetime('now'),
           full_name = COALESCE(?2, full_name),
           picture_url = COALESCE(?3, picture_url),
           email_verified = 1
         WHERE id = ?1`,
      )
        .bind(userId, claims.name || null, claims.picture || null)
        .run();
    } else {
      userId = `u_${nanoid(16)}`;
      role = 'viewer';
      kyc = 'none';
      await c.env.DB.prepare(
        `INSERT INTO users (id, google_sub, email, email_verified, full_name, picture_url, role, kyc_status)
         VALUES (?1, ?2, ?3, 1, ?4, ?5, 'viewer', 'none')`,
      )
        .bind(userId, claims.sub, claims.email, claims.name || null, claims.picture || null)
        .run();
    }

    const token = await issueAppJwt(c.env, { userId, email: claims.email, role, kycStatus: kyc });

    // Audit
    await c.env.DB.prepare(
      `INSERT INTO audit_logs (id, user_id, action, ip, ua) VALUES (?1, ?2, 'LOGIN_GOOGLE', ?3, ?4)`,
    )
      .bind(
        `al_${nanoid(12)}`,
        userId,
        c.req.header('CF-Connecting-IP') || '',
        c.req.header('User-Agent') || '',
      )
      .run()
      .catch(() => {});

    return c.json({
      success: true,
      token,
      user: {
        id: userId,
        email: claims.email,
        full_name: claims.name || null,
        picture_url: claims.picture || null,
        role,
        kyc_status: kyc,
      },
    });
  },
);

/** GET /api/auth/me */
authRoutes.get('/me', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const row = await c.env.DB.prepare(
    `SELECT id, email, full_name, picture_url, role, kyc_status, created_at
     FROM users WHERE id = ?1`,
  )
    .bind(auth.userId)
    .first();
  if (!row) throw new HTTPException(404, { message: 'User not found' });
  return c.json(row);
});

/** POST /api/auth/logout — stateless; client drops token. */
authRoutes.post('/logout', requireAuth, async (c) => {
  // Future: add token revocation list in KV keyed by jti.
  return c.json({ success: true });
});

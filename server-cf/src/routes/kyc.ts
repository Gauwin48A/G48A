import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { nanoid } from 'nanoid';
import type { HonoEnv } from '../types';
import { requireAuth, requireAdmin, rateLimit } from '../middleware';

export const kycRoutes = new Hono<HonoEnv>();

/**
 * KYC flow (pluggable):
 *  1. Client uploads doc images to /kyc/upload (multipart-ish, single file per call)
 *  2. Client calls POST /kyc/submit with { docType, docNumber, docFrontKey, docBackKey?, selfieKey? }
 *  3. Server marks user kyc_status = 'pending'
 *  4. In production:
 *     - If KYC_PROVIDER_KEY is configured, the /kyc/submit handler would call the provider
 *       (Hyperverge/Digio/Karza/IDfy) and await webhook at /kyc/webhook.
 *     - Otherwise: manual admin approval via POST /kyc/:id/approve (requireAdmin).
 *  5. On verified: user.role -> 'seller', user.kyc_status -> 'verified'.
 */

const DOC_TYPES = new Set(['aadhaar', 'pan', 'passport', 'driving_license']);

/** POST /api/kyc/upload   (raw bytes, Content-Type image/*) — returns KYC_DOCS R2 key */
kycRoutes.post(
  '/upload',
  requireAuth,
  rateLimit({ bucket: 'kyc_upload', max: 10, windowSeconds: 3600 }),
  async (c) => {
    const auth = c.get('auth')!;
    const contentType = c.req.header('Content-Type') || '';
    if (!contentType.startsWith('image/') && contentType !== 'application/pdf') {
      throw new HTTPException(400, { message: 'Content-Type must be image/* or application/pdf' });
    }
    const body = await c.req.arrayBuffer();
    if (body.byteLength > 8 * 1024 * 1024) {
      throw new HTTPException(413, { message: 'File too large (max 8 MB)' });
    }
    const slot = c.req.query('slot') || 'doc'; // 'front' | 'back' | 'selfie'
    const key = `kyc/${auth.userId}/${slot}_${Date.now()}_${nanoid(8)}`;
    await c.env.KYC_DOCS.put(key, body, {
      httpMetadata: { contentType },
      customMetadata: { uploaderId: auth.userId, slot },
    });
    return c.json({ key, size: body.byteLength });
  },
);

/** POST /api/kyc/submit */
kycRoutes.post(
  '/submit',
  requireAuth,
  rateLimit({ bucket: 'kyc_submit', max: 5, windowSeconds: 3600 }),
  async (c) => {
    const auth = c.get('auth')!;
    type SubmitBody = {
      docType?: string;
      docNumber?: string;
      docFrontKey?: string;
      docBackKey?: string;
      selfieKey?: string;
    };
    const body = (await c.req.json().catch(() => ({}))) as SubmitBody;

    const docType = (body.docType || '').toLowerCase();
    if (!DOC_TYPES.has(docType)) {
      throw new HTTPException(400, { message: 'Invalid docType' });
    }
    if (!body.docNumber || body.docNumber.length < 4) {
      throw new HTTPException(400, { message: 'docNumber required' });
    }
    if (!body.docFrontKey) {
      throw new HTTPException(400, { message: 'docFrontKey required (upload first)' });
    }

    // Strong format checks (India)
    if (docType === 'aadhaar' && !/^\d{12}$/.test(body.docNumber)) {
      throw new HTTPException(400, { message: 'Aadhaar must be 12 digits' });
    }
    if (docType === 'pan' && !/^[A-Z]{5}\d{4}[A-Z]$/.test(body.docNumber.toUpperCase())) {
      throw new HTTPException(400, { message: 'PAN format invalid' });
    }

    const masked = body.docNumber.slice(-4);
    const submissionId = `kyc_${nanoid(16)}`;

    await c.env.DB.prepare(
      `INSERT INTO kyc_submissions
         (id, user_id, provider, doc_type, doc_number_masked, doc_front_key, doc_back_key, selfie_key, status)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending')`,
    )
      .bind(
        submissionId,
        auth.userId,
        c.env.KYC_PROVIDER_KEY ? 'external' : 'mock',
        docType,
        masked,
        body.docFrontKey,
        body.docBackKey || null,
        body.selfieKey || null,
      )
      .run();

    await c.env.DB.prepare(`UPDATE users SET kyc_status = 'pending' WHERE id = ?1`)
      .bind(auth.userId)
      .run();

    // If a provider key is set, in a real deployment you'd kick off the provider here.
    // For mock: auto-verify after 0s (admin/cron can also do this).
    if (!c.env.KYC_PROVIDER_KEY) {
      // Mock verification — approves immediately. Remove once wired to a real provider.
      await approveSubmission(c.env, submissionId, auth.userId, null);
      return c.json({ success: true, submissionId, status: 'verified', mock: true });
    }

    return c.json({ success: true, submissionId, status: 'pending' });
  },
);

/** GET /api/kyc/status */
kycRoutes.get('/status', requireAuth, async (c) => {
  const auth = c.get('auth')!;
  const user = await c.env.DB.prepare(
    `SELECT kyc_status, role FROM users WHERE id = ?1`,
  ).bind(auth.userId).first<{ kyc_status: string; role: string }>();
  const latest = await c.env.DB.prepare(
    `SELECT id, status, doc_type, doc_number_masked, rejection_reason, submitted_at, reviewed_at
     FROM kyc_submissions WHERE user_id = ?1 ORDER BY submitted_at DESC LIMIT 1`,
  ).bind(auth.userId).first();
  return c.json({
    kyc_status: user?.kyc_status ?? 'none',
    role: user?.role ?? 'viewer',
    latest_submission: latest ?? null,
  });
});

/** POST /api/kyc/:id/approve  (admin) */
kycRoutes.post('/:id/approve', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const sub = await c.env.DB.prepare(
    `SELECT user_id FROM kyc_submissions WHERE id = ?1`,
  ).bind(id).first<{ user_id: string }>();
  if (!sub) throw new HTTPException(404, { message: 'Submission not found' });
  await approveSubmission(c.env, id, sub.user_id, c.get('auth')?.userId ?? null);
  return c.json({ success: true });
});

/** POST /api/kyc/:id/reject  (admin)  body: { reason } */
kycRoutes.post('/:id/reject', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const { reason } = (await c.req.json().catch(() => ({}))) as { reason?: string };
  const sub = await c.env.DB.prepare(
    `SELECT user_id FROM kyc_submissions WHERE id = ?1`,
  ).bind(id).first<{ user_id: string }>();
  if (!sub) throw new HTTPException(404, { message: 'Submission not found' });

  await c.env.DB.prepare(
    `UPDATE kyc_submissions SET status = 'rejected', rejection_reason = ?2,
       reviewed_at = datetime('now'), reviewer_id = ?3 WHERE id = ?1`,
  )
    .bind(id, reason || 'Rejected', c.get('auth')?.userId ?? null)
    .run();
  await c.env.DB.prepare(
    `UPDATE users SET kyc_status = 'rejected', updated_at = datetime('now') WHERE id = ?1`,
  ).bind(sub.user_id).run();
  return c.json({ success: true });
});

async function approveSubmission(env: HonoEnv['Bindings'], submissionId: string, userId: string, reviewerId: string | null) {
  await env.DB.prepare(
    `UPDATE kyc_submissions
     SET status = 'verified', reviewed_at = datetime('now'), reviewer_id = ?2
     WHERE id = ?1`,
  ).bind(submissionId, reviewerId).run();
  await env.DB.prepare(
    `UPDATE users SET kyc_status = 'verified', role = 'seller', updated_at = datetime('now')
     WHERE id = ?1`,
  ).bind(userId).run();
}

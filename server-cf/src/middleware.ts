import type { Context, MiddlewareHandler, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { HonoEnv, AuthContext } from './types';
import { verifyAppJwt } from './jwt';

/**
 * Attach AuthContext if a valid Bearer token is present. Does not throw on missing.
 * Downstream handlers use `requireAuth`/`requireSeller` guards as needed.
 */
export const optionalAuth: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const header = c.req.header('Authorization');
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    try {
      const auth = await verifyAppJwt(c.env, token);
      c.set('auth', auth);
    } catch {
      // ignore — unauthenticated
    }
  }
  await next();
};

export const requireAuth: MiddlewareHandler<HonoEnv> = async (c, next) => {
  if (!c.get('auth')) throw new HTTPException(401, { message: 'Authentication required' });
  await next();
};

export const requireSeller: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const auth = c.get('auth') as AuthContext | undefined;
  if (!auth) throw new HTTPException(401, { message: 'Authentication required' });
  if (auth.role !== 'seller' && auth.role !== 'admin') {
    throw new HTTPException(403, {
      message: 'Seller access required. Complete KYC verification to post.',
    });
  }
  if (auth.kycStatus !== 'verified' && auth.role !== 'admin') {
    throw new HTTPException(403, { message: 'KYC verification required' });
  }
  await next();
};

export const requireAdmin: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const auth = c.get('auth') as AuthContext | undefined;
  const headerKey = c.req.header('X-Admin-Key');
  if (auth?.role === 'admin') {
    await next();
    return;
  }
  if (c.env.ADMIN_API_KEY && headerKey && headerKey === c.env.ADMIN_API_KEY) {
    await next();
    return;
  }
  throw new HTTPException(403, { message: 'Admin access required' });
};

/**
 * Lightweight KV-backed fixed-window rate limiter.
 * Key format: rl:<bucket>:<identifier>:<window>
 */
export function rateLimit(opts: {
  bucket: string;
  max: number;
  windowSeconds: number;
  identifier?: (c: Context<HonoEnv>) => string;
}): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    const now = Math.floor(Date.now() / 1000);
    const win = Math.floor(now / opts.windowSeconds);
    const id = opts.identifier
      ? opts.identifier(c)
      : (c.get('auth')?.userId ||
         c.req.header('CF-Connecting-IP') ||
         c.req.header('x-forwarded-for') ||
         'anon');
    const key = `rl:${opts.bucket}:${id}:${win}`;
    const current = parseInt((await c.env.CACHE.get(key)) || '0', 10);
    if (current >= opts.max) {
      throw new HTTPException(429, { message: 'Too many requests. Slow down.' });
    }
    // best-effort increment
    await c.env.CACHE.put(key, String(current + 1), {
      expirationTtl: opts.windowSeconds + 5,
    });
    await next();
  };
}

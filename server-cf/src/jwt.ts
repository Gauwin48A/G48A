import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';
import type { Env, AuthContext } from './types';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

// Cached JWKS per isolate — jose handles fetching & caching internally.
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function jwks() {
  if (!cachedJwks) cachedJwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  return cachedJwks;
}

export interface GoogleIdTokenClaims {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  aud: string;
  iss: string;
}

/** Verify a Google ID token against Google's JWKS and expected audience. */
export async function verifyGoogleIdToken(
  idToken: string,
  expectedAudience: string,
): Promise<GoogleIdTokenClaims> {
  const { payload } = await jwtVerify(idToken, jwks(), {
    audience: expectedAudience,
  });
  if (!payload.iss || !GOOGLE_ISSUERS.has(String(payload.iss))) {
    throw new Error('Invalid issuer');
  }
  if (!payload.sub || !payload.email) {
    throw new Error('Token missing required claims');
  }
  return {
    sub: String(payload.sub),
    email: String(payload.email),
    email_verified: Boolean(payload.email_verified),
    name: payload.name as string | undefined,
    picture: payload.picture as string | undefined,
    aud: String(payload.aud),
    iss: String(payload.iss),
  };
}

/** Issue an internal JWT for the Android client. */
export async function issueAppJwt(env: Env, auth: AuthContext): Promise<string> {
  const ttl = parseInt(env.ACCESS_TOKEN_TTL_SECONDS || '2592000', 10); // 30 days
  const key = new TextEncoder().encode(env.JWT_SECRET);
  return await new SignJWT({
    sub: auth.userId,
    email: auth.email,
    role: auth.role,
    kyc: auth.kycStatus,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer('mhub-api')
    .setAudience('mhub-android')
    .setExpirationTime(`${ttl}s`)
    .sign(key);
}

export async function verifyAppJwt(env: Env, token: string): Promise<AuthContext> {
  const key = new TextEncoder().encode(env.JWT_SECRET);
  const { payload } = await jwtVerify(token, key, {
    issuer: 'mhub-api',
    audience: 'mhub-android',
  });
  return {
    userId: String(payload.sub),
    email: String(payload.email || ''),
    role: (payload.role as AuthContext['role']) || 'viewer',
    kycStatus: (payload.kyc as AuthContext['kycStatus']) || 'none',
  };
}

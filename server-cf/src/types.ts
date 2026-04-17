/**
 * Cloudflare Workers environment bindings.
 * Kept in one place so every module imports a consistent type.
 */
export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  MEDIA: R2Bucket;
  KYC_DOCS: R2Bucket;

  ENV: string;
  GOOGLE_OAUTH_AUDIENCE: string;      // OAuth client ID (Android or Web)
  CORS_ALLOWED_ORIGINS: string;       // comma-separated or "*"
  PUBLIC_MEDIA_HOST: string;          // e.g. https://mhub-media.<acct>.r2.dev
  ACCESS_TOKEN_TTL_SECONDS: string;

  JWT_SECRET: string;                 // secret, via `wrangler secret put`
  ADMIN_API_KEY?: string;             // optional, guards /admin routes
  KYC_PROVIDER_KEY?: string;          // optional, plug into real KYC provider
}

export interface AuthContext {
  userId: string;
  email: string;
  role: 'viewer' | 'seller' | 'admin';
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
}

export type HonoEnv = {
  Bindings: Env;
  Variables: { auth?: AuthContext };
};

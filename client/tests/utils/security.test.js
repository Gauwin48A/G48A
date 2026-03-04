import { describe, expect, it } from 'vitest';
import { isAuthorizedHostname } from './security';

describe('isAuthorizedHostname', () => {
  it('allows exact allowlisted domains', () => {
    expect(isAuthorizedHostname('mhub-mini.vercel.app')).toBe(true);
    expect(isAuthorizedHostname('localhost')).toBe(true);
  });

  it('allows subdomains of allowlisted hosts', () => {
    expect(isAuthorizedHostname('app.mhub-mini.vercel.app')).toBe(true);
  });

  it('blocks lookalike hostnames that only contain allowlisted strings', () => {
    expect(isAuthorizedHostname('mhub-mini.vercel.app.evil.com')).toBe(false);
    expect(isAuthorizedHostname('evilmhub-mini.vercel.app')).toBe(false);
  });

  it('normalizes case and whitespace', () => {
    expect(isAuthorizedHostname('  MHub-App.Vercel.App  ')).toBe(true);
  });
});

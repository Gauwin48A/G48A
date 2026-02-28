// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { buildApiPath, getApiOriginBase, getApiRootUrl, getSocketUrl } from './networkConfig';

afterEach(() => {
  delete window.__MHUB_API_ORIGIN_OVERRIDE__;
});

describe('networkConfig', () => {
  it('uses runtime override for API root and socket URL', () => {
    window.__MHUB_API_ORIGIN_OVERRIDE__ = 'http://localhost:5000';

    expect(getApiOriginBase()).toBe('http://localhost:5000');
    expect(getApiRootUrl()).toBe('http://localhost:5000/api');
    expect(getSocketUrl()).toBe('http://localhost:5000');
    expect(buildApiPath('/categories')).toBe('http://localhost:5000/api/categories');
  });

  it('falls back to default dev origin on localhost runtime', () => {
    expect(getApiOriginBase()).toBe('http://localhost:5001');
    expect(getApiRootUrl()).toBe('http://localhost:5001/api');
    expect(getSocketUrl()).toBe('http://localhost:5001');
  });
});

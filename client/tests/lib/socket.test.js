// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
const { ioMock } = vi.hoisted(() => ({
  ioMock: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn()
  }))
}));
vi.mock('socket.io-client', () => ({
  default: ioMock
}));
describe('socket configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    ioMock.mockClear();
    delete window.__MHUB_API_ORIGIN_OVERRIDE__;
  });
  it('uses expected socket.io connection options', async () => {
    window.__MHUB_API_ORIGIN_OVERRIDE__ = 'http://localhost:5001';
    await import('../../src/lib/socket');
    expect(ioMock).toHaveBeenCalledTimes(1);
    const [url, options] = ioMock.mock.calls[0];
    expect(url).toBe('http://localhost:5001');
    expect(options.path).toBe('/socket.io');
    expect(options.transports).toEqual(['websocket', 'polling']);
    expect(options.reconnectionAttempts).toBeGreaterThan(0);
    expect(options.timeout).toBeGreaterThan(0);
  });
});

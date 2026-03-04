// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}));
vi.mock('../../src/services/api', () => ({
  default: apiMock
}));
import { getChannelByUser } from '../../src/lib/api';
function makeHttpError(status, message = 'Not Found') {
  return {
    status,
    message,
    response: {
      status,
      data: {
        error: message
      }
    }
  };
}
describe('lib/api channel owner compatibility', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.put.mockReset();
  });
  it('falls back to legacy /channel/:userId when /channels/owner/:userId returns 404', async () => {
    apiMock.get
      .mockRejectedValueOnce(makeHttpError(404))
      .mockResolvedValueOnce({ channel_id: 'chan-1', owner_id: '260', name: 'Legacy Channel' });
    const result = await getChannelByUser('260');
    expect(apiMock.get).toHaveBeenNthCalledWith(1, '/channels/owner/260');
    expect(apiMock.get).toHaveBeenNthCalledWith(2, '/channel/260');
    expect(result).toEqual(expect.objectContaining({ channel_id: 'chan-1' }));
  });
  it('returns null when both modern and legacy owner routes return 404', async () => {
    apiMock.get
      .mockRejectedValueOnce(makeHttpError(404))
      .mockRejectedValueOnce(makeHttpError(404));
    const result = await getChannelByUser('260');
    expect(apiMock.get).toHaveBeenNthCalledWith(1, '/channels/owner/260');
    expect(apiMock.get).toHaveBeenNthCalledWith(2, '/channel/260');
    expect(result).toBeNull();
  });
});

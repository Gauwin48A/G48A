jest.mock('../src/config/db', () => ({
  query: jest.fn()
}));

const pool = require('../src/config/db');
const postViewBufferService = require('../src/services/postViewBufferService');

describe('postViewBufferService', () => {
  beforeEach(() => {
    pool.query.mockReset();
    postViewBufferService.resetForTests();
    delete process.env.BATCH_VIEW_SYNC_MODE;
  });

  it('sanitizes and deduplicates uuid post ids', () => {
    const validA = '00000000-0000-4000-8000-000000000001';
    const validB = '00000000-0000-4000-8000-000000000002';
    const sanitized = postViewBufferService.sanitizePostIds([
      validA,
      validA,
      'not-a-uuid',
      `  ${validB}  `
    ]);

    expect(sanitized).toEqual([validA, validB]);
  });

  it('enqueues async and flushes buffered increments', async () => {
    const validA = '00000000-0000-4000-8000-000000000011';
    const validB = '00000000-0000-4000-8000-000000000012';
    pool.query.mockResolvedValue({ rowCount: 2 });

    const enqueueResult = await postViewBufferService.enqueueBatchView([validA, validB]);
    expect(enqueueResult.mode).toBe('async');
    expect(enqueueResult.queued).toBe(2);

    const flushResult = await postViewBufferService.flushNow();
    expect(flushResult.failed).toBe(false);
    expect(flushResult.updatedRows).toBe(2);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('supports sync mode for strict updates', async () => {
    process.env.BATCH_VIEW_SYNC_MODE = 'true';
    pool.query.mockResolvedValue({ rowCount: 1 });
    const validA = '00000000-0000-4000-8000-000000000021';

    const result = await postViewBufferService.enqueueBatchView([validA]);
    expect(result.mode).toBe('sync');
    expect(result.updated).toBe(1);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});

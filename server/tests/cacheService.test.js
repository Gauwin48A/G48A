const cacheServiceModule = require('../src/services/cacheService');
const { CacheService } = cacheServiceModule;

describe('CacheService optimization behavior', () => {
    let cacheService;

    beforeEach(() => {
        cacheService = new CacheService();
    });

    afterEach(() => {
        jest.useRealTimers();
        cacheService.flush();
        cacheService.cache.close();
    });

    afterAll(() => {
        cacheServiceModule.cache.close();
    });

    it('clears exact keys without affecting siblings', () => {
        cacheService.set('feed:exact', { value: 1 });
        cacheService.set('feed:exact:child', { value: 2 });

        const deleted = cacheService.clearPattern('feed:exact');

        expect(deleted).toBe(1);
        expect(cacheService.get('feed:exact')).toBeUndefined();
        expect(cacheService.get('feed:exact:child')).toEqual({ value: 2 });
    });

    it('supports wildcard invalidation for prefix patterns', () => {
        cacheService.set('feed:user:1', 1);
        cacheService.set('feed:user:2', 2);
        cacheService.set('profile:user:1', 3);

        const deleted = cacheService.clearPattern('feed:user:*');

        expect(deleted).toBe(2);
        expect(cacheService.get('feed:user:1')).toBeUndefined();
        expect(cacheService.get('feed:user:2')).toBeUndefined();
        expect(cacheService.get('profile:user:1')).toBe(3);
    });

    it('treats regex metacharacters in patterns as literals', () => {
        cacheService.set('user.profile:1', 1);
        cacheService.set('userXprofile:1', 2);

        const deleted = cacheService.clearPattern('user.profile:*');

        expect(deleted).toBe(1);
        expect(cacheService.get('user.profile:1')).toBeUndefined();
        expect(cacheService.get('userXprofile:1')).toBe(2);
    });

    it('invalidates related exact and wildcard patterns together', () => {
        cacheService.set('feed:1', 1);
        cacheService.set('feed:2', 2);
        cacheService.set('profile:1', 3);
        cacheService.set('keep:1', 4);

        const deleted = cacheService.invalidateRelated(['feed:*', 'profile:1', 'feed:*']);

        expect(deleted).toBe(3);
        expect(cacheService.get('feed:1')).toBeUndefined();
        expect(cacheService.get('feed:2')).toBeUndefined();
        expect(cacheService.get('profile:1')).toBeUndefined();
        expect(cacheService.get('keep:1')).toBe(4);
    });

    it('prevents cache stampede by sharing in-flight fetches', async () => {
        let fetchCount = 0;

        const fetcher = async () => {
            fetchCount += 1;
            await new Promise((resolve) => setTimeout(resolve, 10));
            return { ok: true };
        };

        const [resultA, resultB] = await Promise.all([
            cacheService.getOrSetWithStampedeProtection('stampede:key', fetcher, 30),
            cacheService.getOrSetWithStampedeProtection('stampede:key', fetcher, 30)
        ]);

        expect(resultA).toEqual({ ok: true });
        expect(resultB).toEqual({ ok: true });
        expect(fetchCount).toBe(1);
    });

    it('clears lock timeout handles after waiting on in-flight request', async () => {
        jest.useFakeTimers();
        let fetchCount = 0;

        const fetcher = async () => {
            fetchCount += 1;
            return new Promise((resolve) => {
                setTimeout(() => resolve({ done: true }), 5);
            });
        };

        const first = cacheService.getOrSetWithStampedeProtection('timeout:key', fetcher, 30, 1000);
        const second = cacheService.getOrSetWithStampedeProtection('timeout:key', fetcher, 30, 1000);

        await jest.advanceTimersByTimeAsync(10);
        await Promise.all([first, second]);

        expect(fetchCount).toBe(1);
        expect(jest.getTimerCount()).toBe(0);
    });
});

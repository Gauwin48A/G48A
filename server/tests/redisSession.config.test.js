function withRedisModule(envOverrides = {}) {
    const previous = new Map();
    for (const [key, value] of Object.entries(envOverrides)) {
        previous.set(key, process.env[key]);
        process.env[key] = value;
    }

    jest.resetModules();

    const redisInstance = {
        on: jest.fn(),
        connect: jest.fn(() => Promise.resolve()),
        quit: jest.fn(() => Promise.resolve()),
        disconnect: jest.fn(),
        get: jest.fn(),
        setex: jest.fn(),
        del: jest.fn(),
        incr: jest.fn(),
        expire: jest.fn()
    };

    const RedisMock = jest.fn(() => redisInstance);
    jest.doMock('ioredis', () => RedisMock);
    const redisSession = require('../src/config/redisSession');

    const restore = async () => {
        await redisSession.close();
        for (const [key, oldValue] of previous.entries()) {
            if (oldValue === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = oldValue;
            }
        }
        jest.dontMock('ioredis');
        jest.resetModules();
    };

    return { redisSession, RedisMock, redisInstance, restore };
}

describe('redisSession config', () => {
    it('prefers REDIS_URL when provided', async () => {
        const { RedisMock, redisInstance, restore } = withRedisModule({
            REDIS_URL: 'redis://cache.example:6380/2'
        });

        try {
            expect(RedisMock).toHaveBeenCalledWith(
                'redis://cache.example:6380/2',
                expect.objectContaining({
                    retryDelayOnFailover: 100,
                    maxRetriesPerRequest: 1,
                    lazyConnect: true
                })
            );
            expect(redisInstance.connect).toHaveBeenCalledTimes(1);
        } finally {
            await restore();
        }
    });

    it('sanitizes REDIS_PORT and REDIS_DB when using host config', async () => {
        const { RedisMock, restore } = withRedisModule({
            REDIS_HOST: 'cache.internal',
            REDIS_PORT: 'not-a-number',
            REDIS_DB: '-2',
            REDIS_PASSWORD: 'secret'
        });

        try {
            expect(RedisMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: 'cache.internal',
                    port: 6379,
                    db: 0,
                    password: 'secret',
                    retryDelayOnFailover: 100,
                    maxRetriesPerRequest: 1,
                    lazyConnect: true
                })
            );
        } finally {
            await restore();
        }
    });
});

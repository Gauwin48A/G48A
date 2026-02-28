const path = require('path');
const {
    evaluateRequiredConfig,
    evaluateSnapshot,
    runReadinessChecks
} = require('../src/services/readinessService');

describe('readinessService', () => {
    it('fails required config when critical env values are missing', () => {
        const result = evaluateRequiredConfig({
            JWT_SECRET: 'abc',
            REFRESH_SECRET: ''
        });
        expect(result.status).toBe('fail');
        expect(result.missing).toContain('REFRESH_SECRET');
        expect(result.missing).toContain('DB_HOST');
    });

    it('warns when snapshot is stale', () => {
        const fixture = path.resolve(__dirname, 'test1.json');
        const result = evaluateSnapshot(
            {
                DIRECTORY_SNAPSHOT_PATH: fixture,
                DIRECTORY_SNAPSHOT_MAX_AGE_HOURS: '0'
            },
            new Date()
        );
        expect(result.status).toBe('warn');
        expect(result.configured).toBe(true);
    });

    it('returns ready when db/config checks pass and non-critical checks are skipped', async () => {
        const readiness = await runReadinessChecks({
            pool: { query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) },
            cacheService: null,
            sessionStore: null,
            env: {
                JWT_SECRET: 'a',
                REFRESH_SECRET: 'b',
                DB_HOST: 'localhost',
                DB_PORT: '5432',
                DB_NAME: 'mhub',
                DB_USER: 'postgres'
            }
        });

        expect(readiness.status).toBe('ready');
        expect(readiness.checks.db.status).toBe('pass');
        expect(readiness.checks.requiredConfig.status).toBe('pass');
    });

    it('supports memory session fallback as pass when explicitly allowed', async () => {
        const readiness = await runReadinessChecks({
            pool: { query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) },
            cacheService: null,
            sessionStore: {
                isRedisAvailable: jest.fn().mockReturnValue(false)
            },
            env: {
                JWT_SECRET: 'a',
                REFRESH_SECRET: 'b',
                DB_HOST: 'localhost',
                DB_PORT: '5432',
                DB_NAME: 'mhub',
                DB_USER: 'postgres',
                READINESS_ALLOW_MEMORY_SESSION_FALLBACK: 'true'
            }
        });

        expect(readiness.status).toBe('ready');
        expect(readiness.checks.sessionStore.status).toBe('pass');
        expect(readiness.checks.sessionStore.mode).toBe('memory-fallback');
    });
});

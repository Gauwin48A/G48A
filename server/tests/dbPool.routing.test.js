function loadDbPoolWithMockedPg(replicaHosts = 'replica-a,replica-b') {
    process.env.DB_REPLICA_HOSTS = replicaHosts;

    const createdPools = [];
    jest.resetModules();

    jest.doMock('pg', () => {
        class MockPool {
            constructor(config) {
                this.config = config;
                this.query = jest.fn(async () => ({ rows: [] }));
                this.connect = jest.fn();
                this.on = jest.fn();
                this.totalCount = 0;
                this.idleCount = 0;
                this.waitingCount = 0;
                createdPools.push(this);
            }
        }

        return { Pool: MockPool };
    });

    let dbPool;
    jest.isolateModules(() => {
        dbPool = require('../src/config/dbPool');
    });
    return { dbPool, createdPools };
}

describe('dbPool query routing', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
        jest.dontMock('pg');
        jest.resetModules();
    });

    it('routes read CTE queries to replicas instead of primary', async () => {
        const { dbPool, createdPools } = loadDbPoolWithMockedPg();
        const primary = createdPools[0];
        const replicaA = createdPools[1];
        const replicaB = createdPools[2];

        await dbPool.query('SELECT 1');
        await dbPool.query('WITH config AS (SELECT 1) SELECT * FROM config');

        expect(primary.query).not.toHaveBeenCalled();
        expect(replicaA.query).toHaveBeenCalledTimes(1);
        expect(replicaB.query).toHaveBeenCalledTimes(1);
    });

    it('routes write CTE queries to primary', async () => {
        const { dbPool, createdPools } = loadDbPoolWithMockedPg();
        const primary = createdPools[0];
        const replicaA = createdPools[1];

        await dbPool.query(
            'WITH updated AS (UPDATE users SET last_login = NOW() RETURNING user_id) SELECT user_id FROM updated'
        );

        expect(primary.query).toHaveBeenCalledTimes(1);
        expect(replicaA.query).not.toHaveBeenCalled();
    });

    it('classifies WITH queries correctly even with comments', () => {
        const { dbPool } = loadDbPoolWithMockedPg();

        expect(
            dbPool.isWriteQuery(`
                -- comment
                WITH active_users AS (SELECT user_id FROM users)
                SELECT user_id FROM active_users
            `)
        ).toBe(false);

        expect(
            dbPool.isWriteQuery(`
                /* mutate rows */
                WITH archived AS (
                    DELETE FROM notifications
                    WHERE created_at < NOW() - INTERVAL '30 days'
                    RETURNING notification_id
                )
                SELECT COUNT(*) FROM archived
            `)
        ).toBe(true);
    });
});

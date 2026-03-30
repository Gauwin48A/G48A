const fs = require('fs');
const os = require('os');
const path = require('path');
const { appendAuditEntry, readRecentEntries, validateAuditEntry } = require('../src/services/flagAuditService');

describe('flagAuditService', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mhub-flag-audit-'));
    const auditPath = path.join(tempRoot, 'feature-flag-audit.log');
    const env = { FEATURE_FLAG_AUDIT_LOG_PATH: auditPath };

    afterEach(() => {
        if (fs.existsSync(auditPath)) {
            fs.unlinkSync(auditPath);
        }
    });

    afterAll(() => {
        fs.rmSync(tempRoot, { recursive: true, force: true });
    });

    it('rejects invalid audit entries missing required fields', () => {
        expect(() => validateAuditEntry({ flagKey: 'ml_fraud_scoring' })).toThrow(
            'Missing required flag audit fields'
        );
    });

    it('writes and reads back structured audit entries', () => {
        appendAuditEntry({
            flagKey: 'ml_fraud_scoring',
            actor: 'release-manager',
            action: 'canary',
            owner: 'risk-team',
            rollbackOwner: 'platform-oncall',
            changeTicket: 'OPS-1001',
            rolloutBefore: 0,
            rolloutAfter: 5,
            reason: 'rollout_canary'
        }, env);

        const entries = readRecentEntries({ limit: 5, env });
        expect(entries.length).toBe(1);
        expect(entries[0].flagKey).toBe('ml_fraud_scoring');
        expect(entries[0].rolloutAfter).toBe(5);
        expect(entries[0].changeTicket).toBe('OPS-1001');
    });
});

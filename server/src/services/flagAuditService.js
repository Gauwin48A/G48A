const fs = require('fs');
const path = require('path');

const DEFAULT_AUDIT_LOG_PATH = path.resolve(process.cwd(), 'docs', 'artifacts', 'feature_flag_audit.log');

function resolveAuditLogPath(env = process.env) {
    const configured = env.FEATURE_FLAG_AUDIT_LOG_PATH;
    if (!configured) return DEFAULT_AUDIT_LOG_PATH;
    return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

function ensureParentDirectory(filePath) {
    const parent = path.dirname(filePath);
    fs.mkdirSync(parent, { recursive: true });
}

function validateAuditEntry(payload = {}) {
    const requiredFields = [
        'flagKey',
        'actor',
        'action',
        'owner',
        'rollbackOwner',
        'changeTicket'
    ];
    const missing = requiredFields.filter((field) => {
        const value = payload[field];
        return value === undefined || value === null || String(value).trim() === '';
    });

    if (missing.length > 0) {
        const error = new Error(`Missing required flag audit fields: ${missing.join(', ')}`);
        error.code = 'FLAG_AUDIT_VALIDATION_FAILED';
        error.missing = missing;
        throw error;
    }
}

function appendAuditEntry(payload = {}, env = process.env) {
    validateAuditEntry(payload);
    const auditPath = resolveAuditLogPath(env);
    ensureParentDirectory(auditPath);

    const entry = {
        timestamp: new Date().toISOString(),
        flagKey: String(payload.flagKey).trim(),
        actor: String(payload.actor).trim(),
        action: String(payload.action).trim(),
        owner: String(payload.owner).trim(),
        rollbackOwner: String(payload.rollbackOwner).trim(),
        changeTicket: String(payload.changeTicket).trim(),
        reason: payload.reason ? String(payload.reason).trim() : null,
        rolloutBefore: payload.rolloutBefore ?? null,
        rolloutAfter: payload.rolloutAfter ?? null,
        expiresOn: payload.expiresOn || null,
        abortThreshold: payload.abortThreshold || null,
        metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}
    };

    fs.appendFileSync(auditPath, `${JSON.stringify(entry)}\n`, 'utf8');
    return {
        auditPath,
        entry
    };
}

function readRecentEntries({ limit = 20, env = process.env } = {}) {
    const auditPath = resolveAuditLogPath(env);
    if (!fs.existsSync(auditPath)) {
        return [];
    }

    const lines = fs.readFileSync(auditPath, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const start = Math.max(0, lines.length - limit);
    return lines.slice(start).map((line) => {
        try {
            return JSON.parse(line);
        } catch {
            return { parseError: true, raw: line };
        }
    });
}

module.exports = {
    appendAuditEntry,
    readRecentEntries,
    resolveAuditLogPath,
    validateAuditEntry
};

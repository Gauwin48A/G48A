const rateLimit = require('express-rate-limit');

const SQLI_PATTERNS = [
  /\bunion\b\s+\bselect\b/i,
  /\bdrop\b\s+\btable\b/i,
  /\binsert\b\s+\binto\b/i,
  /\bdelete\b\s+\bfrom\b/i,
  /--/,
  /\/\*/
];

const XSS_PATTERNS = [
  /<script\b[^>]*>/i,
  /<\/script>/i,
  /javascript:/i,
  /\bonerror\s*=/i,
  /\bonload\s*=/i
];

const BOT_UA_PATTERNS = [
  /\bbot\b/i,
  /\bcrawler\b/i,
  /\bspider\b/i,
  /\bcurl\b/i,
  /\bwget\b/i
];

function parseCsvEnv(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function flattenInput(value, output) {
  if (value === null || value === undefined) return;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    output.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => flattenInput(entry, output));
    return;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((entry) => flattenInput(entry, output));
  }
}

function hasAttackPattern(content, patterns) {
  return patterns.some((pattern) => pattern.test(content));
}

function wafEvidenceHeaders(req, res, next) {
  res.setHeader('X-WAF-Enforced', 'true');
  next();
}

function wafRequestFilter(req, res, next) {
  const blockedCountries = new Set(parseCsvEnv(process.env.WAF_BLOCKED_COUNTRIES).map((item) => item.toUpperCase()));
  const botAllowList = new Set(parseCsvEnv(process.env.WAF_BOT_ALLOWLIST).map((item) => item.toLowerCase()));
  const botProtectionEnabled = String(process.env.WAF_BOT_PROTECTION_ENABLED || 'true').toLowerCase() === 'true';

  if (req.method === 'OPTIONS' || req.path === '/health' || req.path === '/api/health') {
    return next();
  }

  if (blockedCountries.size > 0) {
    const country = String(req.headers['cf-ipcountry'] || req.headers['x-country-code'] || '').toUpperCase();
    if (country && blockedCountries.has(country)) {
      return res.status(403).json({ error: 'Request blocked by WAF geo policy', code: 'WAF_GEO_BLOCK' });
    }
  }

  if (botProtectionEnabled) {
    const userAgent = String(req.headers['user-agent'] || '');
    const allowListed = botAllowList.size > 0
      && Array.from(botAllowList).some((allowedAgent) => userAgent.toLowerCase().includes(allowedAgent));
    if (!allowListed && BOT_UA_PATTERNS.some((pattern) => pattern.test(userAgent))) {
      return res.status(403).json({ error: 'Request blocked by WAF bot policy', code: 'WAF_BOT_BLOCK' });
    }
  }

  const chunks = [];
  flattenInput(req.query, chunks);
  flattenInput(req.body, chunks);
  flattenInput(req.params, chunks);
  chunks.push(req.originalUrl || req.url || '');

  const combined = chunks.join(' ');

  if (hasAttackPattern(combined, SQLI_PATTERNS)) {
    return res.status(403).json({ error: 'Request blocked by WAF SQLi rule', code: 'WAF_SQLI_BLOCK' });
  }
  if (hasAttackPattern(combined, XSS_PATTERNS)) {
    return res.status(403).json({ error: 'Request blocked by WAF XSS rule', code: 'WAF_XSS_BLOCK' });
  }

  return next();
}

const strictLoginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number.parseInt(process.env.WAF_LOGIN_MAX_REQ_PER_MINUTE, 10) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Request blocked by WAF rate limiting',
    code: 'WAF_RATE_LIMIT'
  }
});

module.exports = {
  wafEvidenceHeaders,
  wafRequestFilter,
  strictLoginLimiter
};

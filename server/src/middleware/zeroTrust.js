const { authenticateToken } = require("./security");

function parseBoolean(rawValue, fallback = false) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return fallback;
  }
  const normalized = String(rawValue).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseCsvEnv(value, fallback = []) {
  if (!value) return fallback;
  const list = String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length ? list : fallback;
}

const ZERO_TRUST_MODE = parseBoolean(process.env.ZERO_TRUST_MODE, false);
const ZERO_TRUST_REQUIRE_AUTH_FOR_READS = parseBoolean(
  process.env.ZERO_TRUST_REQUIRE_AUTH_FOR_READS,
  false,
);

const DEFAULT_PUBLIC_PREFIXES = [
  "/api/auth",
  "/api/health",
  "/api/ready",
  "/api/channels/featured",
];

const PUBLIC_PATH_PREFIXES = parseCsvEnv(
  process.env.ZERO_TRUST_PUBLIC_PATH_PREFIXES,
  DEFAULT_PUBLIC_PREFIXES,
);

const PUBLIC_PATHS = new Set(
  parseCsvEnv(process.env.ZERO_TRUST_PUBLIC_PATHS, []),
);

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function normalizePath(path) {
  if (!path) return "/";
  return path.split("?")[0];
}

function isPublicPath(path) {
  if (PUBLIC_PATHS.has(path)) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) =>
    path.startsWith(prefix),
  );
}

const zeroTrustGate = (req, res, next) => {
  if (!ZERO_TRUST_MODE) return next();

  const rawPath = req.path || req.originalUrl || req.url || "/";
  const path = normalizePath(rawPath);

  if (!path.startsWith("/api")) {
    return next();
  }

  if (isPublicPath(path)) {
    return next();
  }

  const method = String(req.method || "").toUpperCase();
  if (!ZERO_TRUST_REQUIRE_AUTH_FOR_READS && READ_METHODS.has(method)) {
    return next();
  }

  return authenticateToken(req, res, next);
};

module.exports = {
  zeroTrustGate,
};

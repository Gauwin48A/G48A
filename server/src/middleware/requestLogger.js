const logger = require("../config/logger");

function parseBoolean(rawValue, fallback = false) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return fallback;
  }
  const normalized = String(rawValue).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseSampleRate(rawValue, fallback = 1) {
  const parsed = Number.parseFloat(String(rawValue ?? ""));
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) {
    return fallback;
  }
  return parsed;
}

function parseCsvEnv(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const isProduction = process.env.NODE_ENV === "production";
const LOG_HTTP_REQUESTS = parseBoolean(
  process.env.LOG_HTTP_REQUESTS,
  isProduction,
);
const HTTP_LOG_SAMPLE_RATE = parseSampleRate(
  process.env.HTTP_LOG_SAMPLE_RATE,
  1,
);
const HTTP_LOG_SKIP_PATHS = new Set(
  parseCsvEnv(process.env.HTTP_LOG_SKIP_PATHS || "/api/health,/api/ready"),
);

const shouldSkipPath = (path) =>
  HTTP_LOG_SKIP_PATHS.has(path) ||
  Array.from(HTTP_LOG_SKIP_PATHS).some(
    (prefix) => prefix.endsWith("*") && path.startsWith(prefix.slice(0, -1)),
  );

const requestLogger = (req, res, next) => {
  if (!LOG_HTTP_REQUESTS) return next();

  const rawPath = req.originalUrl || req.url || "";
  const pathOnly = rawPath.split("?")[0];
  if (shouldSkipPath(pathOnly)) return next();

  const logThisRequest = HTTP_LOG_SAMPLE_RATE >= 1
    ? true
    : Math.random() <= HTTP_LOG_SAMPLE_RATE;

  const start = process.hrtime.bigint();

  res.on("finish", () => {
    if (!logThisRequest) return;
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const userId = req.user?.user_id || req.user?.userId || req.user?.id || null;
    logger.info(
      {
        method: req.method,
        path: rawPath,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        ip: req.ip,
        userId,
        correlationId: req.correlationId,
        userAgent: req.headers["user-agent"] || null,
      },
      "http_request",
    );
  });

  next();
};

module.exports = {
  requestLogger,
};

function parseBoolean(rawValue, fallback = false) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return fallback;
  }
  const normalized = String(rawValue).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseSupportedVersions(rawValue) {
  const fallback = ["1"];
  if (!rawValue) return fallback;
  const versions = String(rawValue)
    .split(",")
    .map((version) => version.trim().replace(/^v/i, ""))
    .filter(Boolean);
  return versions.length > 0 ? [...new Set(versions)] : fallback;
}

function resolveRequestedVersion(req) {
  const headerVersion = req.headers["x-api-version"];
  const queryVersion = req.query?.api_version;
  const raw = headerVersion || queryVersion;
  if (!raw) return null;
  return String(raw).trim().replace(/^v/i, "");
}

function shouldEnforceVersionHeader(req, requireForWrites) {
  if (!requireForWrites) return false;
  const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  return writeMethods.has(String(req.method || "").toUpperCase());
}

function apiContractGuard(req, res, next) {
  const supportedVersions = parseSupportedVersions(process.env.API_SUPPORTED_VERSIONS);
  const defaultVersion = supportedVersions[0];
  const requireVersionForWrites = parseBoolean(process.env.API_REQUIRE_VERSION_FOR_WRITES, false);

  const requestedVersion = resolveRequestedVersion(req);
  const hasVersionHeader = requestedVersion !== null;
  const isVersionRequired = shouldEnforceVersionHeader(req, requireVersionForWrites);

  if (isVersionRequired && !hasVersionHeader) {
    return res.status(400).json({
      error: "Missing API version.",
      message: "Provide x-api-version header for write operations.",
      supported_versions: supportedVersions,
    });
  }

  if (requestedVersion && !supportedVersions.includes(requestedVersion)) {
    return res.status(400).json({
      error: "Unsupported API version.",
      requested_version: requestedVersion,
      supported_versions: supportedVersions,
    });
  }

  const effectiveVersion = requestedVersion || defaultVersion;
  req.apiContract = {
    requestedVersion,
    effectiveVersion,
    supportedVersions,
  };

  res.setHeader("x-api-version", `v${effectiveVersion}`);
  res.setHeader("x-api-supported-versions", supportedVersions.map((version) => `v${version}`).join(","));
  return next();
}

module.exports = {
  apiContractGuard,
  parseSupportedVersions,
  resolveRequestedVersion,
  parseBoolean,
};

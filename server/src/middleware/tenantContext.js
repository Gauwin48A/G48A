function parseBoolean(rawValue, fallback = false) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return fallback;
  }
  const normalized = String(rawValue).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function extractTokenTenantId(req) {
  const user = req.user || {};
  const claims = [
    user.tenantId,
    user.tenant_id,
    user.orgId,
    user.org_id,
    user.workspaceId,
    user.workspace_id,
  ];
  const match = claims.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
  return match ? String(match).trim() : null;
}

function extractHeaderTenantId(req) {
  const candidates = [
    req.headers["x-tenant-id"],
    req.headers["x-org-id"],
    req.headers["x-workspace-id"],
  ];
  const match = candidates.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
  return match ? String(match).trim() : null;
}

function isTenantExemptPath(pathname = "") {
  const exemptPrefixes = [
    "/api/health",
    "/api/ready",
    "/api/auth",
    "/api/publicwall",
    "/api/public-wall",
    "/api/categories",
  ];
  return exemptPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isWriteMethod(method = "") {
  const normalized = String(method).toUpperCase();
  return normalized === "POST" || normalized === "PUT" || normalized === "PATCH" || normalized === "DELETE";
}

function isAdminRole(req) {
  const role = String(req.user?.role || req.user?.userRole || "").trim().toLowerCase();
  return role === "admin" || role === "super_admin" || role === "superadmin";
}

function tenantContextGuard(req, res, next) {
  const headerTenantId = extractHeaderTenantId(req);
  const tokenTenantId = extractTokenTenantId(req);
  const pathname = String(req.path || req.originalUrl || "");

  if (headerTenantId && tokenTenantId && headerTenantId !== tokenTenantId) {
    return res.status(403).json({
      error: "Tenant mismatch.",
      message: "Header tenant does not match authenticated tenant context.",
    });
  }

  const effectiveTenantId = tokenTenantId || headerTenantId || null;
  req.tenantContext = {
    tenantId: effectiveTenantId,
    source: tokenTenantId ? "token" : headerTenantId ? "header" : "none",
  };

  const requireTenantForWrites = parseBoolean(process.env.TENANT_CONTEXT_REQUIRED_WRITE, false);
  const requireTenantForAll = parseBoolean(process.env.TENANT_CONTEXT_REQUIRED_ALL, false);
  const requiresTenant =
    !isTenantExemptPath(pathname) && (requireTenantForAll || (requireTenantForWrites && isWriteMethod(req.method)));

  if (requiresTenant && !effectiveTenantId) {
    return res.status(400).json({
      error: "Missing tenant context.",
      message: "Provide tenant context for this request.",
    });
  }

  res.setHeader("x-tenant-context", effectiveTenantId ? "bound" : "none");
  return next();
}

function requireTenantContext(options = {}) {
  const {
    writeOnly = false,
    featureFlag = "TENANT_CONTEXT_ENFORCE_CRITICAL_WRITE_ROUTES",
    allowAdminBypass = true,
    routeName = "route",
  } = options;

  return (req, res, next) => {
    if (featureFlag && !parseBoolean(process.env[featureFlag], false)) {
      return next();
    }

    if (writeOnly && !isWriteMethod(req.method)) {
      return next();
    }

    const tenantId =
      req.tenantContext?.tenantId || extractTokenTenantId(req) || extractHeaderTenantId(req);

    if (tenantId) {
      if (!req.tenantContext || !req.tenantContext.tenantId) {
        req.tenantContext = {
          tenantId,
          source: "derived",
        };
      }
      return next();
    }

    if (allowAdminBypass && isAdminRole(req)) {
      return next();
    }

    return res.status(400).json({
      error: "Missing tenant context.",
      message: `Tenant context is required for ${routeName}.`,
    });
  };
}

module.exports = {
  tenantContextGuard,
  requireTenantContext,
  extractHeaderTenantId,
  extractTokenTenantId,
  isTenantExemptPath,
  isWriteMethod,
  parseBoolean,
};

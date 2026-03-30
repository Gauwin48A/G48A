// contract-marker: const io = new Server(server, {

/* ─────────────────────────────────────────────────────────
   Mhub Backend — Express Server Entry Point
   ───────────────────────────────────────────────────────── */

// ── Environment & Error Reporting ────────────────────────
const dotenv = require("dotenv");
dotenv.config();

const { initErrorReporter } = require("./services/errorReporter");
initErrorReporter();

// ── Core Dependencies ────────────────────────────────────
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { getUploadsDir, getUploadsSubdir } = require("./utils/uploads");

// ── Security & Middleware ────────────────────────────────
const {
  apiLimiter,
  sanitizeInput,
  securityHeaders,
  authenticateToken,
} = require("./middleware/security");
const { requestLogger } = require("./middleware/requestLogger");
const { zeroTrustGate } = require("./middleware/zeroTrust");
const { optionalAuth } = require("./middleware/auth");
const { apiContractGuard } = require("./middleware/apiContract");
const { runtimeBudgetGuard } = require("./middleware/runtimeBudget");
const {
  tenantContextGuard,
  requireTenantContext,
} = require("./middleware/tenantContext");
const {
  wafEvidenceHeaders,
  wafRequestFilter,
} = require("./middleware/wafEnforcement");
const { riskRestrictionMiddleware } = require("./middleware/riskRestrictions");

// ── Config & Services ────────────────────────────────────
const cacheLayer = require("./config/redisCache");
const sessionStore = require("./config/redisSession");
const { runReadinessChecks } = require("./services/readinessService");
const pool = require("./config/db.js");
const { enforceHttps } = require("./config/https");

// ── Route Imports ────────────────────────────────────────
const authRoutes = require("./routes/auth.js");
const aadhaarRoutes = require("./routes/aadhaar.js");
const referralRoutes = require("./routes/referral.js");
const recommendationsRoutes = require("./routes/recommendations.js");
const profileRoutes = require("./routes/profile.js");
const categoriesRoutes = require("./routes/categories.js");
const subcategoriesRoutes = require("./routes/subcategories.js");
const postsRoutes = require("./routes/posts.js");
const notificationsRoutes = require("./routes/notifications.js");
const feedRoutes = require("./routes/feed.js");
const feedbackRoutes = require("./routes/feedback.js");
const dashboardRoutes = require("./routes/dashboard.js");
const complaintsRoutes = require("./routes/complaints.js");
const adminDashboardRoutes = require("./routes/adminDashboard.js");
const rewardsRoutes = require("./routes/rewards.js");
const locationRoutes = require("./routes/locationRoutes.js");
const locationVerificationRoutes = require("./routes/locationVerificationRoutes.js");
const inquiriesRoutes = require("./routes/inquiries.js");
const chatRoutes = require("./routes/chat.js");
const offersRoutes = require("./routes/offers.js");
const savedSearchesRoutes = require("./routes/savedSearches.js");
const analyticsRoutes = require("./routes/analytics.js");
const analyticsController = require("./controllers/analyticsController");
const wishlistRoutes = require("./routes/wishlist.js");
const recentlyViewedRoutes = require("./routes/recentlyViewed.js");
const cartRoutes = require("./routes/cart.js");
const priceAlertsRoutes = require("./routes/priceAlerts.js");
const priceHistoryRoutes = require("./routes/priceHistory.js");
const tiersRoutes = require("./routes/tiers.js");
const brandsRoutes = require("./routes/brands.js");
const pushNotificationsRoutes = require("./routes/pushNotifications.js");
const nearbyRoutes = require("./routes/nearby.js");
const productsRoutes = require("./routes/products.js");
const reviewsRoutes = require("./routes/reviews.js");
const publicWallRoutes = require("./routes/publicWall.js");
const transactionsRoutes = require("./routes/transactions.js");
const channelsRoutes = require("./routes/channels.js");
const gdprRoutes = require("./routes/gdpr.js");
const saleRoutes = require("./routes/sale.js");
const translationRoutes = require("./routes/translation.js");
const contactsRoutes = require("./routes/contacts.js");
const twoFactorRoutes = require("./routes/twoFactor.js");
const paymentRoutes = require("./routes/payments.js");
const cmsRoutes = require("./routes/cms.js");
const adminRoutes = require("./routes/admin.js");
const usersRoutes = require("./routes/users.js");
const deviceLifecycleRoutes = require("./routes/deviceLifecycle.js");
const telemetryRoutes = require("./routes/telemetry.js");
const automationRoutes = require("./routes/automation.js");
const fleetOrchestrationRoutes = require("./routes/fleetOrchestration.js");
const securityOperationsRoutes = require("./routes/securityOperations.js");
const reliabilityRoutes = require("./routes/reliability.js");
const operatorPlatformRoutes = require("./routes/operatorPlatform.js");
const intelligenceFinopsRoutes = require("./routes/intelligenceFinops.js");
const launchGovernanceRoutes = require("./routes/launchGovernance.js");
const subscriptionRoutes = require("./routes/subscriptions.js");
const coinRoutes = require("./routes/coins.js");
const walletRoutes = require("./routes/wallet.js");
const sellerAnalyticsRoutes = require("./routes/sellerAnalytics.js");
const { setNotificationSocket } = require("./services/notificationEmitter");

/* ─────────────────────────────────────────────────────────
   Express App Setup
   ───────────────────────────────────────────────────────── */

const app = express();
app.set("db", pool);

// ── Trust Proxy ──────────────────────────────────────────
function resolveTrustProxySetting(rawValue) {
  const normalized = String(rawValue || "").trim();
  if (!normalized) return false;
  if (normalized.toLowerCase() === "true") return true;
  if (normalized.toLowerCase() === "false") return false;
  if (/^\d+$/.test(normalized)) return Number.parseInt(normalized, 10);
  return normalized;
}

const trustProxySetting = resolveTrustProxySetting(process.env.TRUST_PROXY);
if (trustProxySetting !== false) {
  app.set("trust proxy", trustProxySetting);
}

// ── Correlation ID Middleware ─────────────────────────────
app.use((req, res, next) => {
  const incomingCorrelationId =
    req.headers["x-correlation-id"] || req.headers["x-request-id"];
  const correlationId = incomingCorrelationId
    ? String(incomingCorrelationId)
    : crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);
  next();
});

app.use(requestLogger);

app.set("query parser", "extended");

// ── Environment Helpers ──────────────────────────────────
const sanitizeOrigin = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const isDevelopment = process.env.NODE_ENV !== "production";
const isProduction = process.env.NODE_ENV === "production";

// O-05: Fail fast in production if critical environment variables are missing
if (isProduction) {
  const REQUIRED_PROD_ENV_VARS = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DB_HOST',
    'DB_PASSWORD',
    'SESSION_SECRET',
  ];
  const apiIntegrityEnabled = parseBooleanEnv(
    process.env.API_INTEGRITY_ENABLED,
    true
  );
  if (apiIntegrityEnabled) {
    REQUIRED_PROD_ENV_VARS.push('API_INTEGRITY_SECRET');
  }

  const deviceAttestationRequired = parseBooleanEnv(
    process.env.DEVICE_ATTESTATION_REQUIRED,
    false
  );
  if (deviceAttestationRequired) {
    REQUIRED_PROD_ENV_VARS.push('DEVICE_ATTESTATION_SECRET');
  }

  const missingVars = REQUIRED_PROD_ENV_VARS.filter((key) => !process.env[key]);
  const insecureDefaults = [];
  if (
    apiIntegrityEnabled &&
    String(process.env.API_INTEGRITY_SECRET || '').trim() ===
      'mhub-api-integrity-default'
  ) {
    insecureDefaults.push('API_INTEGRITY_SECRET');
  }

  if (missingVars.length > 0 || insecureDefaults.length > 0) {
    if (missingVars.length > 0) {
      console.error(
        `[startup] FATAL: Missing required production environment variables: ${missingVars.join(', ')}`
      );
    }
    if (insecureDefaults.length > 0) {
      console.error(
        `[startup] FATAL: Insecure default values detected for: ${insecureDefaults.join(', ')}`
      );
    }
    console.error(
      '[startup] Set these variables in your .env file or deployment environment before starting.'
    );
    process.exit(1);
  }
}

function parseBooleanEnv(rawValue, fallback) {
  if (rawValue === undefined || rawValue === null || rawValue === "")
    return fallback;
  const normalized = String(rawValue).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

const disableBackgroundJobs = parseBooleanEnv(
  process.env.DISABLE_BACKGROUND_JOBS,
  false
);
const enableTestNotificationEndpoint = parseBooleanEnv(
  process.env.ENABLE_TEST_NOTIFICATION_ENDPOINT,
  !isProduction
);
const readinessTreatDegradedAsNotReady = parseBooleanEnv(
  process.env.READINESS_DEGRADED_AS_NOT_READY,
  isProduction
);

/** Returns middleware requiring tenant context for critical write operations */
const requireCriticalTenantWriteContext = (routeName) =>
  requireTenantContext({
    writeOnly: true,
    featureFlag: "TENANT_CONTEXT_ENFORCE_CRITICAL_WRITE_ROUTES",
    routeName,
  });

/* ─────────────────────────────────────────────────────────
   CORS Configuration
   ───────────────────────────────────────────────────────── */

const localhostOriginPattern =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const defaultCorsOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:3000",
];

const parseOriginList = (...rawLists) =>
  rawLists
    .flatMap((raw) => String(raw || "").split(","))
    .map((origin) => sanitizeOrigin(origin))
    .filter(Boolean);

const envCorsOrigins = parseOriginList(
  process.env.CORS_ORIGINS,
  process.env.CORS_ORIGIN,
  process.env.ALLOWED_ORIGINS
);

const configuredCorsOrigins = new Set(
  [process.env.CLIENT_URL, ...envCorsOrigins, ...defaultCorsOrigins]
    .map((origin) => sanitizeOrigin(origin))
    .filter(Boolean)
);

const isOriginAllowed = (origin) => {
  // Allow server-to-server requests (no Origin) only in development
  if (!origin) return isDevelopment;
  const normalizedOrigin = sanitizeOrigin(origin);
  if (configuredCorsOrigins.has(normalizedOrigin)) return true;
  if (isDevelopment && localhostOriginPattern.test(normalizedOrigin))
    return true;
  return false;
};

const resolveCorsOrigin = (origin, callback) => {
  if (isOriginAllowed(origin)) return callback(null, true);
  console.warn(`[CORS] Blocked origin: ${origin}`);
  return callback(new Error("Not allowed by CORS"));
};

const commonAllowedHeaders = [
  "Content-Type",
  "Authorization",
  "X-Device-Id",
  "X-Device-Fingerprint",
  "X-Timezone",
  "X-Correlation-Id",
  "X-Request-Id",
  "X-Location-Signature",
  "X-Load-Test-Scenario",
  "X-Simulated-User",
  "X-XSRF-TOKEN",
  "X-CSRF-Token",
  "X-Platform",
  "X-MHub-VPN-Detected",
  "X-MHub-Timestamp",
  "X-MHub-Nonce",
  "X-MHub-Signature",
  "X-MHub-DevTools",
];

const corsOptions = {
  origin: resolveCorsOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: commonAllowedHeaders,
  exposedHeaders: ["x-correlation-id", "x-request-id"],
  optionsSuccessStatus: 204,
};

/* ─────────────────────────────────────────────────────────
   HTTP Server & Socket.IO
   ───────────────────────────────────────────────────────── */

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: resolveCorsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: commonAllowedHeaders,
  },
});

const socketDebugEnabled = process.env.NODE_ENV !== "production";

// ── Socket.IO Authentication Middleware ──────────────────
const { verifyToken: verifySocketToken } = require("./services/tokenVerificationCache");

io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    (socket.handshake.headers?.authorization || "").replace(/^Bearer\s+/i, "") ||
    null;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  try {
    const payload = verifySocketToken(token, JWT_CONFIG.SECRET, {
      issuer: JWT_CONFIG.ISSUER,
      audience: allowedAudiences,
    });
    socket.user = payload;
    return next();
  } catch {
    return next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  if (socketDebugEnabled) {
    console.log(`User Connected: ${socket.id} (uid: ${socket.user?.userId || socket.user?.id})`);
  }

  socket.on("join_room", (data) => {
    const roomId = String(data || "");
    const userId = String(socket.user?.userId || socket.user?.id || "");

    // Validate room membership: user must be the room ID or a participant
    if (roomId && userId) {
      const roomParts = roomId.split("_");
      const isMember = roomId === userId || roomParts.includes(userId);
      if (!isMember) {
        if (socketDebugEnabled) {
          console.warn(`[Socket] User ${userId} denied access to room: ${roomId}`);
        }
        socket.emit("error", { message: "Access denied to this room" });
        return;
      }
    }

    socket.join(roomId);
    if (socketDebugEnabled) {
      console.log(`User with ID: ${socket.id} joined room: ${roomId}`);
    }
  });

  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    if (socketDebugEnabled) {
      console.log("User Disconnected", socket.id);
    }
  });
});

app.set("io", io);
setNotificationSocket(io);

/* ─────────────────────────────────────────────────────────
   Global Middleware Stack (order matters!)
   ───────────────────────────────────────────────────────── */

const { burstLimiter, perUserLimiter, writeOperationLimiter } = require("./middleware/enhancedRateLimiter");

app.use(compression());
app.use(enforceHttps);
app.use(securityHeaders);
app.disable("x-powered-by");
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(burstLimiter);
app.use(apiLimiter);
app.use(perUserLimiter);
app.use(writeOperationLimiter);
app.use(cookieParser());
app.use(
  express.json({
    limit: "50kb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "50kb" }));
app.use(hpp());
app.use(wafEvidenceHeaders);
app.use(wafRequestFilter);
app.use(sanitizeInput);

// ── Global VPN/Proxy Blocker ──────────────────────────────
const { globalVpnBlocker } = require("./middleware/vpnBlocker");
app.use(globalVpnBlocker);

// ── API Integrity (anti-replay, bot detection, DevTools block) ──
const { antiReplayProtection, blockDevToolsRequests, botDetection } = require("./middleware/apiIntegrity");
app.use(botDetection);
app.use(blockDevToolsRequests);
app.use(antiReplayProtection);

if (!isProduction) console.log("🛡️ Operation Polish: Security & Performance middleware loaded");

// ── VPN Enforcement (server-side) ────────────────────────
const { vpnEnforcementMiddleware } = require("./middleware/vpnEnforcement");
app.use("/api", vpnEnforcementMiddleware);

// ── API-scoped Middleware ────────────────────────────────
const { trackActivity } = require("./middleware/activityTracker.js");
  app.use("/api", trackActivity);
  app.use("/api", runtimeBudgetGuard);
app.use("/api", apiContractGuard);
app.use("/api", zeroTrustGate);
  app.use("/api", tenantContextGuard);
  app.use("/api", optionalAuth);
  app.use("/api", riskRestrictionMiddleware);

// Analytics fast-path (client telemetry)
app.post(
  "/api/analytics/client-event",
  optionalAuth,
  analyticsController.saveClientEvent
);
app.post(
  "/api/analytics/client-error",
  optionalAuth,
  analyticsController.saveClientError
);
app.post(
  "/api/analytics/device",
  optionalAuth,
  analyticsController.saveDeviceInfo
);

/* ─────────────────────────────────────────────────────────
   Health Check (lightweight — no DB)
   ───────────────────────────────────────────────────────── */

app.get("/health", (req, res) => {
  res.status(200).json({
    service: "mhub-backend",
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/* ─────────────────────────────────────────────────────────
   Route Mounts — Individually Mounted
   ───────────────────────────────────────────────────────── */

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/subcategories", subcategoriesRoutes);
app.use(
  "/api/posts",
  requireCriticalTenantWriteContext("posts write operations"),
  postsRoutes
);
app.use("/api/location", locationRoutes);
app.use("/api/v1/location", locationVerificationRoutes);
app.use("/api/location", locationVerificationRoutes);
app.use(
  "/api/channel",
  requireCriticalTenantWriteContext("channel write operations"),
  channelsRoutes
);
app.use(
  "/api/channels",
  requireCriticalTenantWriteContext("channels write operations"),
  channelsRoutes
);
app.use("/api/publicwall", publicWallRoutes);
app.use("/api/public-wall", publicWallRoutes);
app.use("/api/users", usersRoutes);

/* ─────────────────────────────────────────────────────────
   Route Mounts — Bulk (path → handler or [middleware, handler])
   ───────────────────────────────────────────────────────── */

const apiRouteMounts = [
  ["/api/aadhaar", aadhaarRoutes],
  ["/api/gdpr", gdprRoutes],
  ["/api/referral", referralRoutes],
  ["/api/recommendations", recommendationsRoutes],
  ["/api/profile", profileRoutes],
  ["/api/notifications", notificationsRoutes],
  ["/api/cart", cartRoutes],
  ["/api/feed", feedRoutes],
  ["/api/feedback", feedbackRoutes],
  ["/api/dashboard", dashboardRoutes],
  ["/api/complaints", complaintsRoutes],
  ["/api/admin/dashboard", adminDashboardRoutes],
  [
    "/api/rewards",
    [
      requireCriticalTenantWriteContext("rewards write operations"),
      rewardsRoutes,
    ],
  ],
  ["/api/inquiries", inquiriesRoutes],
  ["/api/chat", chatRoutes],
  [
    "/api/offers",
    [
      requireCriticalTenantWriteContext("offers write operations"),
      offersRoutes,
    ],
  ],
  ["/api/saved-searches", savedSearchesRoutes],
  ["/api/analytics", analyticsRoutes],
  ["/api/wishlist", wishlistRoutes],
  ["/api/recently-viewed", recentlyViewedRoutes],
  ["/api/price-alerts", priceAlertsRoutes],
  ["/api/price-history", priceHistoryRoutes],
  ["/api/tiers", tiersRoutes],
  ["/api/brands", brandsRoutes],
  ["/api/push", pushNotificationsRoutes],
  ["/api/nearby", nearbyRoutes],
  ["/api/products", productsRoutes],
  ["/api/reviews", reviewsRoutes],
  [
    "/api/sale",
    [
      requireCriticalTenantWriteContext("sale write operations"),
      saleRoutes,
    ],
  ],
  [
    "/api/transactions",
    [
      requireCriticalTenantWriteContext("transactions write operations"),
      transactionsRoutes,
    ],
  ],
  ["/api/translation", translationRoutes],
  ["/api/contacts", contactsRoutes],
  ["/api/cms", cmsRoutes],
  ["/api/auth/2fa", twoFactorRoutes],
  [
    "/api/payments",
    [
      requireCriticalTenantWriteContext("payments write operations"),
      paymentRoutes,
    ],
  ],
  ["/api/device-lifecycle", deviceLifecycleRoutes],
  ["/api/telemetry", telemetryRoutes],
  ["/api/automation", automationRoutes],
  ["/api/fleet-orchestration", fleetOrchestrationRoutes],
  ["/api/security-operations", securityOperationsRoutes],
  ["/api/reliability", reliabilityRoutes],
  ["/api/operator-platform", operatorPlatformRoutes],
  ["/api/intelligence-finops", intelligenceFinopsRoutes],
  ["/api/launch-governance", launchGovernanceRoutes],
  ["/api/admin", adminRoutes],
  [
    "/api/subscriptions",
    [
      requireCriticalTenantWriteContext("subscriptions write operations"),
      subscriptionRoutes,
    ],
  ],
  ["/api/coins", coinRoutes],
  ["/api/wallet", walletRoutes],
  ["/api/seller-analytics", sellerAnalyticsRoutes],
];

for (const [routePath, routeHandler] of apiRouteMounts) {
  if (Array.isArray(routePath)) {
    for (const aliasPath of routePath) {
      app.use(aliasPath, routeHandler);
    }
  } else {
    app.use(routePath, routeHandler);
  }
}

/* ─────────────────────────────────────────────────────────
   Cron / Background Jobs
   ───────────────────────────────────────────────────────── */

const { initCronJobs } = require("./jobs/cronJobs.js");

/* ─────────────────────────────────────────────────────────
   Static File Serving
   ───────────────────────────────────────────────────────── */

app.use(
  "/static",
  express.static(path.join(__dirname, "../public"), {
    maxAge: "30d",
    immutable: true,
    etag: true,
  })
);

const uploadsDir = getUploadsDir();
const optimizedUploadsDir = getUploadsSubdir("optimized");
getUploadsSubdir("optimized", "thumbnails");

app.use(
  "/uploads",
  express.static(uploadsDir, {
    maxAge: "7d",
    etag: true,
  })
);

app.use(
  "/uploads/optimized",
  express.static(optimizedUploadsDir, {
    maxAge: "30d",
    immutable: true,
  })
);

if (!isProduction) console.log("📁 Static file caching configured");

/* ─────────────────────────────────────────────────────────
   API Health & Readiness Probes
   ───────────────────────────────────────────────────────── */

/** Deep health check — verifies DB connectivity */
app.get("/api/health", async (req, res) => {
  try {
    const time = await pool.query("SELECT NOW()");
    res.json({
      service: "mhub-backend",
      status: "ok",
      db: "connected",
      time: time.rows[0].now,
    });
  } catch (err) {
    res.status(200).json({
      service: "mhub-backend",
      status: "ok",
      db: "disconnected",
      time: null,
      error: err.message,
    });
  }
});

/** Readiness probe — checks DB + cache + session store */
app.get("/api/ready", async (req, res) => {
  try {
    const readiness = await runReadinessChecks({
      pool,
      cacheService: cacheLayer,
      sessionStore,
    });
    const statusCode =
      readiness.status === "not_ready" ||
      (readinessTreatDegradedAsNotReady && readiness.status === "degraded")
        ? 503
        : 200;
    return res.status(statusCode).json(readiness);
  } catch (err) {
    return res.status(503).json({
      status: "not_ready",
      checkedAt: new Date().toISOString(),
      error: err.message,
    });
  }
});

/** Root endpoint — simple liveness response */
app.get("/", (req, res) => {
  res.send("Backend running successfully.");
});

/* ─────────────────────────────────────────────────────────
   Test Notification Endpoint (dev/staging only)
   ───────────────────────────────────────────────────────── */

const requireAdminRole = (req, res, next) => {
  const role = String(req.user?.role || req.user?.userRole || "")
    .trim()
    .toLowerCase();
  if (
    role === "admin" ||
    role === "super_admin" ||
    role === "superadmin"
  ) {
    return next();
  }
  return res.status(403).json({ error: "Admin access required." });
};

if (enableTestNotificationEndpoint) {
  app.post(
    "/api/test-notification",
    authenticateToken,
    requireAdminRole,
    (req, res) => {
      const { message, type = "info" } = req.body;
      io.emit("notification", {
        id: Date.now(),
        title: "Test Notification",
        message: message || "This is a test notification from server",
        type,
        timestamp: new Date(),
      });
      res.json({ status: "sent", message });
    }
  );
}

/* ─────────────────────────────────────────────────────────
   Error Handling
   ───────────────────────────────────────────────────────── */

const logger = require("./config/logger");
const {
  evaluateFoundationConfig,
} = require("./services/foundationGuardService");
const {
  ensureUserTierColumns,
  ensureSchemaPreflight,
} = require("./services/schemaGuard");
const errorHandler = require("./middleware/errorHandler");

// 404 catch-all
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Global error handler (must be last middleware)
app.use(errorHandler);

/* ─────────────────────────────────────────────────────────
   Server Startup
   ───────────────────────────────────────────────────────── */

const PORT = Number.parseInt(process.env.PORT || "5001", 10) || 5001;
const DEV_FALLBACK_PORTS = isDevelopment
  ? [5001, 5000].filter((candidate) => candidate !== PORT)
  : [];

let serverInstance = null;
let shuttingDown = false;

/**
 * Attempts to listen on the given port.
 * @param {number} port
 * @returns {Promise<void>}
 */
const listenOnPort = (port) =>
  new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port);
  });

/** Starts delayed background services (subscription checks, etc.) */
const startBackgroundJobs = () => {
  if (disableBackgroundJobs) {
    logger.warn("[Startup] Delayed background jobs are disabled.");
    return;
  }

  try {
    initCronJobs();
  } catch (error) {
    logger.warn(`[Startup] Cron init failed: ${error?.message || error}`);
  }

  // Cache warming — run immediately on startup
  try {
    const { warmCache } = require("./services/cacheWarming");
    setTimeout(async () => {
      logger.info("[Startup] Warming Redis cache...");
      await warmCache();
    }, 2000);
  } catch (e) {
    logger.warn(`Cache warming not loaded: ${e.message}`);
  }

  try {
    const {
      checkExpiringSubscriptions,
    } = require("./services/subscriptionNotifications");

    setTimeout(async () => {
      logger.info("Checking expiring subscriptions...");
      await checkExpiringSubscriptions();
      logger.info("Subscription check complete");
    }, 5000);

    setInterval(async () => {
      logger.info("Running daily subscription expiry check...");
      await checkExpiringSubscriptions();
    }, 24 * 60 * 60 * 1000);
  } catch (e) {
    logger.warn(`Subscription service not loaded: ${e.message}`);
  }
};

/**
 * Starts the HTTP server, trying fallback ports in dev mode.
 */
const startServer = async () => {
  const portCandidates = [PORT, ...DEV_FALLBACK_PORTS];

  for (let index = 0; index < portCandidates.length; index += 1) {
    const candidatePort = portCandidates[index];
    try {
      await listenOnPort(candidatePort);
      serverInstance = server;

      if (candidatePort !== PORT) {
        logger.warn(
          `Port ${PORT} is busy. Started on fallback port ${candidatePort} (development only).`
        );
      }

      logger.info(`Server running on port ${candidatePort}`);
      logger.info("System Online: Enforced Architecture");
      startBackgroundJobs();
      return;
    } catch (error) {
      const nextCandidate = portCandidates[index + 1];
      if (error?.code === "EADDRINUSE" && nextCandidate) {
        logger.warn(
          `Port ${candidatePort} is already in use. Trying ${nextCandidate}...`
        );
        continue;
      }
      throw error;
    }
  }
};

/* ─────────────────────────────────────────────────────────
   Bootstrap — Schema checks → Foundation guard → Start
   ───────────────────────────────────────────────────────── */

const strictSchemaContract = isDevelopment
  ? parseBooleanEnv(process.env.STRICT_SCHEMA_CONTRACT, false)
  : parseBooleanEnv(process.env.STRICT_SCHEMA_CONTRACT, true);

const foundationStrictMode = parseBooleanEnv(
  process.env.FOUNDATION_STRICT_MODE,
  isProduction
);

const bootstrap = async () => {
  // Foundation configuration validation
  const foundationReport = evaluateFoundationConfig({
    env: process.env,
    isProduction,
  });
  logger.info(
    `[FoundationGuard] status=${foundationReport.status}; ` +
      `edge=${foundationReport.sections.edgeArchitecture.status}; ` +
      `api=${foundationReport.sections.apiContract.status}; ` +
      `tenant=${foundationReport.sections.tenantIsolation.status}; ` +
      `budget=${foundationReport.sections.runtimeBudgets.status}; ` +
      `secrets=${foundationReport.sections.secrets.status}; ` +
      `promotion=${foundationReport.sections.promotion.status}`
  );

  if (foundationStrictMode && foundationReport.status !== "pass") {
    throw new Error(
      `Foundation configuration status is ${foundationReport.status}`
    );
  }

  // Schema preflight checks
  await ensureUserTierColumns();
  logger.info("Tier schema check complete");

  const schemaReport = await ensureSchemaPreflight({
    strict: strictSchemaContract,
    autoCreateTwoFactorFallback: true,
  });
  logger.info(`[SchemaGuard] Preflight status: ${schemaReport.status}`);

  // Start listening
  await startServer();
};

bootstrap().catch((startupError) => {
  logger.error(`Server startup failed: ${startupError.message}`);
  process.exit(1);
});

/* ─────────────────────────────────────────────────────────
   Graceful Shutdown
   ───────────────────────────────────────────────────────── */

const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received. Shutting down gracefully...`);

  const finalize = () => {
    Promise.allSettled([cacheLayer.close?.(), sessionStore.close?.()]).finally(
      () => {
        pool.end(() => {
          logger.info("Database pool closed. Exiting.");
          process.exit(0);
        });
      }
    );
  };

  if (!serverInstance || !serverInstance.listening) {
    finalize();
    return;
  }

  serverInstance.close(() => {
    finalize();
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ── Unhandled Errors ─────────────────────────────────────
process.on("unhandledRejection", (reason, promise) => {
  logger.error("[UNHANDLED_REJECTION]", reason instanceof Error ? reason.stack : reason);
  // In production, let the process continue; monitoring will catch these
});

process.on("uncaughtException", (err) => {
  logger.error("[UNCAUGHT_EXCEPTION]", err.stack || err);
  // Give the server a moment to flush logs then exit
  if (isProduction) {
    setTimeout(() => process.exit(1), 1000);
  }
});


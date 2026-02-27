const dotenv = require("dotenv");
dotenv.config();
const { initErrorReporter } = require('./services/errorReporter');
initErrorReporter();
const crypto = require('crypto');

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const { apiLimiter, sanitizeInput, securityHeaders } = require('./middleware/security');
const { wafEvidenceHeaders, wafRequestFilter } = require('./middleware/wafEnforcement');
const cacheLayer = require('./config/redisCache');
const sessionStore = require('./config/redisSession');
const { runReadinessChecks } = require('./services/readinessService');

const pool = require("./config/db.js");

// Import Routes
const authRoutes = require("./routes/auth.js");
const referralRoutes = require("./routes/referral.js");
const recommendationsRoutes = require("./routes/recommendations.js");
const profileRoutes = require("./routes/profile.js");
const categoriesRoutes = require("./routes/categories.js");
const postsRoutes = require("./routes/posts.js");
const notificationsRoutes = require("./routes/notifications.js");
const feedRoutes = require("./routes/feed.js");
const feedbackRoutes = require("./routes/feedback.js");
const dashboardRoutes = require("./routes/dashboard.js");
const complaintsRoutes = require("./routes/complaints.js");
const adminDashboardRoutes = require("./routes/adminDashboard.js");
const rewardsRoutes = require("./routes/rewards.js");
const locationRoutes = require("./routes/locationRoutes.js");
const inquiriesRoutes = require("./routes/inquiries.js");
// Batch 2 Routes
const chatRoutes = require("./routes/chat.js");
const offersRoutes = require("./routes/offers.js");
const savedSearchesRoutes = require("./routes/savedSearches.js");
const analyticsRoutes = require("./routes/analytics.js");
// New Features
const wishlistRoutes = require("./routes/wishlist.js");
const recentlyViewedRoutes = require("./routes/recentlyViewed.js");
const priceAlertsRoutes = require("./routes/priceAlerts.js");
const priceHistoryRoutes = require("./routes/priceHistory.js");
const tiersRoutes = require("./routes/tiers.js");
const brandsRoutes = require("./routes/brands.js");
const pushNotificationsRoutes = require("./routes/pushNotifications.js");
const nearbyRoutes = require("./routes/nearby.js");
const reviewsRoutes = require("./routes/reviews.js");
const publicWallRoutes = require("./routes/publicWall.js");
const transactionsRoutes = require("./routes/transactions.js");

const http = require('http');
const { Server } = require("socket.io");

const app = express();
app.set('db', pool);

// Attach correlation IDs for traceability across requests and incident triage.
app.use((req, res, next) => {
  const incomingCorrelationId = req.headers['x-correlation-id'] || req.headers['x-request-id'];
  const correlationId = incomingCorrelationId ? String(incomingCorrelationId) : crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
});

// Enable extended query string parsing for array parameters (e.g., ?category[]=X&category[]=Y)
app.set('query parser', 'extended');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:8080", "http://localhost:8081", "http://localhost:8082", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const socketDebugEnabled = process.env.NODE_ENV !== 'production';

// Socket.io connection handler
io.on('connection', (socket) => {
  if (socketDebugEnabled) {
    console.log(`User Connected: ${socket.id}`);
  }

  socket.on('join_room', (data) => {
    socket.join(data);
    if (socketDebugEnabled) {
      console.log(`User with ID: ${socket.id} joined room: ${data}`);
    }
  });

  socket.on('send_message', (data) => {
    socket.to(data.room).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    if (socketDebugEnabled) {
      console.log('User Disconnected', socket.id);
    }
  });
});

// Make io accessible globally if needed (optional)
app.set('io', io);

// ============================================
// PERFORMANCE & SECURITY MIDDLEWARE (Operation Polish)
// ============================================

// 1. COMPRESSION - Reduce payload size by ~70%
app.use(compression());

// 2. HELMET with Content Security Policy (CSP)
app.use(securityHeaders);

// 2.1 HIDE TECH STACK - Security Best Practice
app.disable('x-powered-by');

// 3. CORS - Dynamic Whitelist (Audit Fix)
const corsWhitelist = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:3000"
].filter(Boolean);
const allowedCorsOrigins = new Set(corsWhitelist);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedCorsOrigins.has(origin)) {
      return callback(null, true);
    }
    console.warn(`🚫 CORS blocked: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// 4. RATE LIMITING (DDoS Protection)
app.use(apiLimiter);

// 5. COOKIE PARSER - Required for HttpOnly JWT cookies
app.use(cookieParser());

// 6. BODY PARSERS with STRICT size limits (Audit Fix: Prevent DoS)
app.use(express.json({ limit: '50kb' })); // Adjusted for slightly larger payloads if needed
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// 7. HPP - Prevent HTTP Parameter Pollution
app.use(hpp());

// 8. Custom WAF rules (SQLi/XSS/bot/geo) with enforcement evidence header
app.use(wafEvidenceHeaders);
app.use(wafRequestFilter);

// 8.1 Input sanitization (defense in depth after explicit WAF blocking)
app.use(sanitizeInput);

console.log('🛡️ Operation Polish: Security & Performance middleware loaded');

// 9. PRESENCE TRACKING: Throttled heartbeat for "Last Seen"
// Only updates DB every 5 minutes per user - saves 99.9% of writes
const { trackActivity } = require('./middleware/activityTracker.js');
app.use('/api', trackActivity);

// 10. HEALTH CHECK (For Production Monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// GDPR Routes (Data Export & Deletion)
const gdprRoutes = require("./routes/gdpr.js");

// MOUNT ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/gdpr', gdprRoutes); // GDPR endpoints
app.use('/api/referral', referralRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/inquiries', inquiriesRoutes);
// Batch 2 Routes
app.use('/api/chat', chatRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/saved-searches', savedSearchesRoutes);
app.use('/api/analytics', analyticsRoutes);
// New Features
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/recently-viewed', recentlyViewedRoutes);
app.use('/api/price-alerts', priceAlertsRoutes);
app.use('/api/price-history', priceHistoryRoutes);
app.use('/api/tiers', tiersRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/push', pushNotificationsRoutes);
app.use('/api/nearby', nearbyRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/publicwall', publicWallRoutes);
app.use('/api/public-wall', publicWallRoutes);
// Blue Team Gap 1: Dual-Handshake Sale Logic
const saleRoutes = require('./routes/sale.js');
app.use('/api/sale', saleRoutes);
app.use('/api/transactions', transactionsRoutes);

// Blue Team Gap 3: Initialize CRON Jobs
const { initCronJobs } = require('./jobs/cronJobs.js');
initCronJobs();

// Defender Prompt 5: Translation Worker
const translationRoutes = require('./routes/translation.js');
app.use('/api/translation', translationRoutes);

// Protocol Native Hybrid: Contacts Sync
const contactsRoutes = require('./routes/contacts.js');
app.use('/api/contacts', contactsRoutes);

// Two-Factor Authentication (2FA)
const twoFactorRoutes = require('./routes/twoFactor.js');
app.use('/api/auth/2fa', twoFactorRoutes);

// PROTOCOL: VALUE HIERARCHY - Zero-Cost Payment System
const paymentRoutes = require('./routes/payments.js');
app.use('/api/payments', paymentRoutes);

// Admin Routes (Verification, Payments, Dashboard)
const adminRoutes = require('./routes/admin.js');
app.use('/api/admin', adminRoutes);

// Users Routes (Profile management)
const usersRoutes = require('./routes/users.js');
app.use('/api/users', usersRoutes);


// ============================================
// STATIC FILE CACHING (CDN Optimization)
// ============================================
const path = require('path');

// Serve static files with long cache headers
app.use('/static', express.static(path.join(__dirname, '../public'), {
  maxAge: '30d',
  immutable: true,
  etag: true
}));

// Serve uploads with cache
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  etag: true
}));

// Optimized images
app.use('/uploads/optimized', express.static(path.join(__dirname, '../uploads/optimized'), {
  maxAge: '30d',
  immutable: true
}));

console.log('📁 Static file caching configured');

// Health check with DB validation
app.get('/api/health', async (req, res) => {
  try {
    const time = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', db: 'connected', time: time.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

app.get('/api/ready', async (req, res) => {
  try {
    const readiness = await runReadinessChecks({
      pool,
      cacheService: cacheLayer,
      sessionStore
    });
    const statusCode = readiness.status === 'not_ready' ? 503 : 200;
    return res.status(statusCode).json(readiness);
  } catch (err) {
    return res.status(503).json({
      status: 'not_ready',
      checkedAt: new Date().toISOString(),
      error: err.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Backend running successfully.');
});

// Test Notification Endpoint
app.post('/api/test-notification', (req, res) => {
  const { message, type = 'info' } = req.body;
  io.emit('notification', {
    id: Date.now(),
    title: 'Test Notification',
    message: message || 'This is a test notification from server',
    type,
    timestamp: new Date()
  });
  res.json({ status: 'sent', message });
});

const logger = require('./config/logger');
const { ensureUserTierColumns } = require('./services/schemaGuard');

// ============================================
// GLOBAL ERROR HANDLING (The Safety Net)
// ============================================
const errorHandler = require('./middleware/errorHandler');

// 404 Handler for unknown routes
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// GLOBAL ERROR HANDLER
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================
const PORT = process.env.PORT || 5000;
ensureUserTierColumns()
  .then(() => logger.info('Tier schema check complete'))
  .catch((schemaErr) => logger.warn(`Tier schema check failed: ${schemaErr.message}`));
const serverInstance = server.listen(PORT, () => {
  logger.info(`✅ Server running on port ${PORT}`);
  logger.info(`🚀 System Online: Enforced Architecture`);

  // PROTOCOL: VALUE HIERARCHY - Check expiring subscriptions on startup
  try {
    const { checkExpiringSubscriptions } = require('./services/subscriptionNotifications');

    // Run once on startup (after 5 second delay to let DB connect)
    setTimeout(async () => {
      logger.info('🔔 Checking expiring subscriptions...');
      await checkExpiringSubscriptions();
      logger.info(`🔔 Subscription check complete`);
    }, 5000);

    // Schedule to run every 24 hours
    setInterval(async () => {
      logger.info('🔔 Running daily subscription expiry check...');
      await checkExpiringSubscriptions();
    }, 24 * 60 * 60 * 1000); // 24 hours
  } catch (e) {
    logger.warn('Subscription service not loaded:', e.message);
  }
});

// ============================================
// GRACEFUL SHUTDOWN (The Resilient Server)
// ============================================
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Closing DB pool and shutting down gracefully...');
  serverInstance.close(() => {
    Promise.allSettled([
      cacheLayer.close?.(),
      sessionStore.close?.()
    ]).finally(() => {
      pool.end(() => {
        logger.info('Database pool closed. Exiting.');
        process.exit(0);
      });
    });
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down...');
  serverInstance.close(() => {
    Promise.allSettled([
      cacheLayer.close?.(),
      sessionStore.close?.()
    ]).finally(() => {
      pool.end(() => {
        logger.info('Database pool closed. Exiting.');
        process.exit(0);
      });
    });
  });
});

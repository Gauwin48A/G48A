const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const { sanitizeInput } = require('./middleware/security');

dotenv.config();

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

const app = express();

// Security & CORS - Allow all common local dev ports
app.use(helmet());
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:8080", "http://localhost:8081", "http://localhost:8082", "http://localhost:3000"],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Global input sanitization (Pillar 4)
app.use(sanitizeInput);

// Global rate limit for all API endpoints (Pillar 1)
app.use('/api/', rateLimit({ windowMs: 1 * 60 * 1000, max: 100, message: { error: 'Too many requests. Please slow down.' } }));

// MOUNT ROUTES
app.use('/api/auth', authRoutes);
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

// Health check with DB validation
app.get('/api/health', async (req, res) => {
  try {
    const time = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', db: 'connected', time: time.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Backend running successfully.');
});

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// Global Error Handler - SECURITY: Never expose internal errors
app.use((err, req, res, next) => {
  console.error("[SECURITY] Server Error:", err.message);
  res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
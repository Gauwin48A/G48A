import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import pool from "./config/db.js";
import referralRoutes from "./routes/referral.js";
import recommendationsRoutes from "./routes/recommendations.js";
import profileRoutes from "./routes/profile.js";
import categoriesRoutes from "./routes/categories.js";
import postsRoutes from "./routes/posts.js";
import notificationsRoutes from "./routes/notifications.js";
import feedRoutes from "./routes/feed.js";
import feedbackRoutes from "./routes/feedback.js";
import dashboardRoutes from "./routes/dashboard.js";
import complaintsRoutes from "./routes/complaints.js";
import adminDashboardRoutes from "./routes/adminDashboard.js";
import rewardsRoutes from "./routes/rewards.js";
import locationRoutes from "./routes/locationRoutes.js";

dotenv.config();

const app = express();

// Security and CORS configuration
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));

app.use(express.json());
app.use(rateLimit({ windowMs: 1 * 60 * 1000, max: 100 }));

// Import and use routes
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: !!pool });
});

// Temporary route to list all mounted routes
app.get('/api/_routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // routes registered directly on the app
      routes.push(middleware.route);
    } else if (middleware.name === 'router') {
      // router middleware
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push(handler.route);
        }
      });
    }
  });
  res.json(routes.map(r => ({ path: r.path, methods: r.methods })));
});

app.get('/', (req, res) => {
  res.send('Backend running successfully.');
});

app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// Error logging middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Unexpected server error", details: err.message });
});

// Server port
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
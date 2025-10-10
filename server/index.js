require("dotenv").config();
const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(express.json());

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, "..", "client", "dist")));

// CORS Setup
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:8081", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST?.trim(),
  port: parseInt(process.env.DB_PORT?.trim(), 10) || 5433,
  user: process.env.DB_USER?.trim(),
  password: process.env.DB_PASSWORD?.trim(),
  database: process.env.DB_NAME?.trim(),
});

// Test DB connection
pool
  .connect()
  .then((client) => {
    console.log(`✅ Connected to PostgreSQL on port ${process.env.DB_PORT}`);
    client.release();
  })
  .catch((err) => {
    console.error("❌ DB connection error:", err.message);
    process.exit(1);
  });

// Export pool for use in other modules
module.exports.pool = pool;

// API Routes
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/profile", require("./src/routes/profile"));
app.use("/api/posts", require("./src/routes/posts"));
app.use("/api/categories", require("./src/routes/categories"));
app.use("/api/notifications", require("./src/routes/notifications"));
app.use("/api/feedback", require("./src/routes/feedback"));
app.use("/api/complaints", require("./src/routes/complaints"));
app.use("/api/tiers", require("./src/routes/tiers"));
app.use("/api/transactions", require("./src/routes/transactions"));
app.use("/api/rewards", require("./src/routes/rewards"));
app.use("/api/referral", require("./src/routes/referral"));
app.use("/api/dailycode", require("./src/routes/dailycode"));
app.use("/api/recommendations", require("./src/routes/recommendations"));
app.use("/api/audit", require("./src/routes/audit"));
app.use("/api/login-audit", require("./src/routes/loginAudit"));
app.use("/api/admin/dashboard", require("./src/routes/adminDashboard"));

// The "catchall" handler for client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "dist", "index.html"));
});

// 404 Handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start Server
const PORT = parseInt(process.env.PORT?.trim(), 10) || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
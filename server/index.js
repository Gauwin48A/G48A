// index.js

require("dotenv").config();
const express = require("express");
const path = require("path");
const { body, validationResult } = require("express-validator");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(express.json());

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// CORS Setup
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:8081", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      console.log('CORS request from origin:', origin);
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

// Test DB connection immediately
pool
  .connect()
  .then((client) => {
    console.log("✅ Connected to PostgreSQL on port", process.env.DB_PORT);
    client.release();
  })
  .catch((err) => {
    console.error("❌ DB connection error:", err.message);
    if (err.code === "ECONNREFUSED") {
      console.error(`❌ Connection refused: Is PostgreSQL running on port ${process.env.DB_PORT}?`);
    } else if (err.code === "28P01") {
      console.error("❌ Invalid authentication: Check DB_USER and DB_PASSWORD in .env");
    } else if (err.code === "3D000") {
      console.error("❌ Database does not exist: Check DB_NAME in .env");
    } else {
      console.error("❌ Unknown DB error:", err.message);
    }
    process.exit(1);
  });

// Export pool for use in route files
module.exports.pool = pool;

// Root Route
app.get("/", (req, res) => {
  res.send("🚀 Backend is running with PostgreSQL!");
});

// Authentication Routes
app.post(
  "/register",
  async (req, res) => {
    await body("username")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters")
      .run(req);
    await body("password")
      .isStrongPassword()
      .withMessage("Password must be strong")
      .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array().map((e) => e.msg) });

    try {
      const { username, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
        [username, hashedPassword]
      );
      res.json({ message: "User registered successfully", user: result.rows[0] });
    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  }
);

app.post(
  "/login",
  async (req, res) => {
    await body("username")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters")
      .run(req);
    await body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array().map((e) => e.msg) });

    try {
      const { username, password } = req.body;
      const result = await pool.query("SELECT * FROM users WHERE username=$1", [username]);

      if (result.rows.length === 0) return res.status(400).json({ error: "User not found" });

      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

      // JWT generation
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET?.trim(), { expiresIn: "1h" });

      res.json({ message: "Login successful", token });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  }
);

// Protected route example
app.get("/profile", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1]; // "Bearer <token>"

    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET?.trim());
    const result = await pool.query("SELECT id, username FROM users WHERE id=$1", [decoded.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Profile route error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

// Modular Routes
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/profile", require("./src/routes/profile"));
app.use("/api/posts", require("./src/routes/posts"));
app.use("/api/categories", require("./src/routes/categories"));
app.use("/api/notifications", require("./src/routes/notifications"));
app.use("/api/feedback", require("./src/routes/feedback"));
app.use("/api/complaints", require("./src/routes/complaints"));
app.use("/api/tiers", require("./src/routes/tiers"));
app.use("/api/transactions", require("./src/routes/transactions"));

// The "catchall" handler: for any request that doesn't match one above,
// send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

// Profile enhancements
app.use("/api/rewards", require("./src/routes/rewards"));
app.use("/api/referral", require("./src/routes/referral"));
app.use("/api/dailycode", require("./src/routes/dailycode"));
app.use("/api/recommendations", require("./src/routes/recommendations"));

// Audit routes
app.use("/api/audit", require("./src/routes/audit"));
app.use("/api/login-audit", require("./src/routes/loginAudit"));

// Admin routes
app.use("/api/admin/dashboard", require("./src/routes/adminDashboard"));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start Server
const PORT = parseInt(process.env.PORT?.trim(), 10) || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

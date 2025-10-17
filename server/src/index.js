const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const pool = require('./config/db');

dotenv.config();

const app = express();

// CORS configuration for credentials and allowed origins
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json());

// Import routes
app.use('/api/referral', require('./routes/referral'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/notifications', require('./routes/notifications'));
const feedRoutes = require('./routes/feed');
app.use('/api/feed', feedRoutes);
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/admin/dashboard', require('./routes/adminDashboard'));
app.use('/api/rewards', require('./routes/rewards'));

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

// Server port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
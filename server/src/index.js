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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: !!pool });
});

// Server port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
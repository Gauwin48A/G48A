# 🛒 MHub - Verified Marketplace Platform

A full-stack, production-ready marketplace application for buying and selling products with verified sellers, real-time location, and intelligent feed algorithms.

![MHub](https://img.shields.io/badge/Version-2.0-blue) ![Node](https://img.shields.io/badge/Node.js-18+-green) ![React](https://img.shields.io/badge/React-18-blue) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)

---

## 📋 Table of Contents

1. [Features](#-features)
2. [Pages & Routes](#-pages--routes)
3. [Tech Stack](#-tech-stack)
4. [Quick Start](#-quick-start)
5. [Configuration](#-configuration)
6. [API Endpoints](#-api-endpoints)
7. [Database](#-database)
8. [Deployment](#-deployment)
9. [Documentation](#-documentation)

---

## ✨ Features

### Core Marketplace
| Feature | Description |
|---------|-------------|
| 🏪 **All Posts** | Browse all listings with Guaranteed Reach algorithm |
| 🔍 **Smart Search** | Search by title, description, seller, category |
| 📍 **Location-Based** | Geo-spatial search for nearby items |
| ❤️ **Wishlist** | Save favorite items for later |
| 👁️ **Recently Viewed** | Track browsing history |
| 📊 **Feed Algorithm** | Fair seller visibility with randomization |

### Seller Features
| Feature | Description |
|---------|-------------|
| ➕ **Create Posts** | Add listings with images, price, location |
| 📈 **Dashboard** | View stats, manage listings |
| 🏆 **Tier System** | Free, Premium, Gold seller tiers |
| ✅ **Verification** | Aadhaar/KYC verification for trust |
| 💬 **Chat** | Real-time messaging with buyers |

### User Experience
| Feature | Description |
|---------|-------------|
| 🌐 **Multi-Language** | i18n support for regional languages |
| 🌙 **Dark Mode** | System-aware theme switching |
| 📱 **Responsive** | Mobile-first design |
| 🔔 **Notifications** | Real-time push notifications |
| 🏅 **Rewards** | Gamification with points system |

### Performance & Scale
| Feature | Description |
|---------|-------------|
| ⚡ **Redis Caching** | Distributed caching for 10L+ users |
| 📊 **Read Replicas** | Database scaling with read replicas |
| ⚖️ **Load Balancing** | Nginx + PM2 cluster mode |
| 🔄 **Lazy Loading** | Code splitting for fast initial load |

---

## 📄 Pages & Routes

### Authentication
| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | User authentication |
| `/signup` | Signup | Multi-step user registration |
| `/forgot-password` | Forgot Password | Password reset request |
| `/reset-password` | Reset Password | Set new password |

### Main Application
| Route | Page | Description |
|-------|------|-------------|
| `/` | Redirect | Redirects to All Posts |
| `/all-posts` | All Posts | Main marketplace feed |
| `/post/:id` | Post Detail | View single listing details |
| `/nearby` | Nearby Posts | Location-based search |

### User Dashboard
| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | Dashboard | User statistics and overview |
| `/profile` | Profile | Edit user profile |
| `/my-home` | My Home | Personal dashboard |
| `/bought-posts` | Bought Posts | Purchase history |
| `/sold-posts` | Sold Posts | Sales history |

### Selling
| Route | Page | Description |
|-------|------|-------------|
| `/add-post` | Add Post | Create new listing |
| `/post_add` | Post Add | Alternative create form |
| `/tier-selection` | Tier Selection | Choose seller tier |
| `/saledone` | Sale Done | Completed sales |
| `/saleundone` | Sale Undone | Cancelled sales |

### Social Feed
| Route | Page | Description |
|-------|------|-------------|
| `/feed` | Feed | Social-style post feed |
| `/feed/:id` | Feed Post Detail | Single feed post |
| `/my-feed` | My Feed | User's own feed posts |
| `/public-wall` | Public Wall | Community posts |

### Features
| Route | Page | Description |
|-------|------|-------------|
| `/wishlist` | Wishlist | Saved items |
| `/recently-viewed` | Recently Viewed | Browsing history |
| `/saved-searches` | Saved Searches | Saved search queries |
| `/my-recommendations` | Recommendations | Personalized suggestions |
| `/categories` | Categories | Browse by category |
| `/rewards` | Rewards | Points and achievements |
| `/notifications` | Notifications | User notifications |
| `/chat` | Chat | Messaging system |

### Other
| Route | Page | Description |
|-------|------|-------------|
| `/verification` | Verification | KYC/Aadhaar verification |
| `/aadhaar-verify` | Aadhaar Verify | ID verification |
| `/admin-panel` | Admin Panel | Admin dashboard |
| `/complaints` | Complaints | Report issues |
| `/feedback` | Feedback | Submit feedback |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite
- **Tailwind CSS** + shadcn/ui
- **React Router v6** for navigation
- **i18next** for internationalization
- **Socket.IO Client** for real-time

### Backend
- **Node.js 18+** with Express
- **PostgreSQL 15** database
- **Redis** for caching
- **JWT** authentication
- **Socket.IO** for WebSockets

### Infrastructure
- **Docker + Docker Compose**
- **Nginx** load balancer
- **PM2** process manager
- **Cloudinary** for images

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis (optional, falls back to in-memory)

### Installation

```bash
# Clone repository
git clone https://github.com/your-repo/mhub.git
cd mhub

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Build client
npm run build

# Run database migrations
cd ../server
psql -U postgres -f database/MASTER_COMPLETE.sql
psql -U postgres -f database/seed_500_posts.sql
psql -U postgres -f database/seed_50_profiles.sql

# Start server
npm run dev
```

### Development

```bash
# Terminal 1: Start server
cd server && npm run dev

# Terminal 2: Start client
cd client && npm run dev
```

---

## ⚙️ Configuration

### Environment Variables (server/.env)

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mhub
DB_USER=postgres
DB_PASSWORD=your_password
DB_POOL_MAX=20

# Read Replicas (optional)
DB_REPLICA_HOSTS=

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-key

# Server
PORT=5000
NODE_ENV=development
```

---

## 📡 API Endpoints

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | Get all posts |
| GET | `/api/posts/for-you` | Guaranteed Reach feed |
| GET | `/api/posts/:id` | Get single post |
| POST | `/api/posts` | Create post |
| PUT | `/api/posts/:id` | Update post |
| DELETE | `/api/posts/:id` | Delete post |
| POST | `/api/posts/:id/like` | Like a post |
| POST | `/api/posts/:id/view` | Track view |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| POST | `/api/auth/refresh` | Refresh token |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get profile |
| PUT | `/api/users/profile` | Update profile |
| GET | `/api/users/wishlist` | Get wishlist |

### Performance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts/cache-stats` | Cache statistics |
| GET | `/health` | Health check |

---

## 🗄️ Database

### Core Tables
- `users` - User accounts
- `profiles` - User profiles
- `posts` - Product listings
- `categories` - Product categories
- `tiers` - Seller tier levels

### Feature Tables
- `wishlist` - Saved items
- `recently_viewed` - View history
- `notifications` - User notifications
- `chat_messages` - Chat history
- `rewards` - User points

---

## 🚢 Deployment

### Docker Compose
```bash
cd server
docker-compose up -d
```

### PM2 Cluster
```bash
pm2 start ecosystem.config.js
```

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure SSL certificates
- [ ] Set up Redis cluster
- [ ] Configure read replicas
- [ ] Enable rate limiting
- [ ] Set up monitoring

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [SECURITY.md](SECURITY.md) | Security features and recommendations |
| [PERFORMANCE.md](PERFORMANCE.md) | Performance optimizations |
| [database/README.md](server/database/README.md) | Database setup guide |

---

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for the Indian marketplace**
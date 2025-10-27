# MHUB Backend

This is the backend (Node.js/Express) for the MHUB multilingual production-ready app. All backend code, migrations, middleware, services, worker, and routes should reside here.

## Structure
- /database: DB schema and migration scripts
- /middleware: Express middleware
- /migrations: SQL migration scripts
- /routes: API endpoints
- /services: Translation, cache, etc.
- /worker: Translation worker
- /src: Main server code
- /tests: Backend tests

## Location Permission Feature
- `/routes/location.js`: API endpoint for saving user location
- `/migrations/003_create_user_locations.sql`: Migration for user_locations table
- Frontend blocks app until location is granted and sends data to backend

## Usage
See main README in project root for setup and deployment instructions.

## Features
- User authentication (JWT)
- Aadhaar/PAN verification
- Post management
- Sale confirmation workflow
- Rewards and notifications
- Admin panel

## API Endpoints
- `/api/auth` — Authentication
- `/api/users` — User management
- `/api/posts` — Post CRUD
- `/api/transactions` — Sale confirmation
- `/api/rewards` — Rewards system
- `/api/notifications` — Notifications
- `/api/admin` — Admin actions

---

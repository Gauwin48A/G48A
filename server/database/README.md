# MHub Database Setup

## Quick Start

```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE mhub;"

# 2. Run schema (creates tables + constraints)
psql -U postgres -d mhub -f 01_schema_ddl.sql

# 3. Run seed data (creates demo users + posts)
psql -U postgres -d mhub -f 02_seed_dml.sql

# 4. (Optional) Run functions/triggers
psql -U postgres -d mhub -f 03_functions_triggers.sql
```

## Files

| File | Purpose |
|------|---------|
| `01_schema_ddl.sql` | Tables, constraints, indexes |
| `02_seed_dml.sql` | Demo users, posts, rewards |
| `03_functions_triggers.sql` | DB functions and triggers |

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@mhub.com` | `password123` | Admin |
| `seller@mhub.com` | `password123` | Premium (Gold) |
| `buyer@mhub.com` | `password123` | User |
| `client_demo@mhub.com` | `password123` | Premium (Gold) |

## Validation Rules

- **Passwords**: bcrypt format (`$2b$10$...`)
- **Prices**: `CHECK (price >= 0)`
- **Roles**: `CHECK (role IN ('user', 'premium', 'admin'))`
- **Emails**: UNIQUE constraint
- **Referrals**: Self-referencing FK with CASCADE

## Tier Thresholds

| Tier | Points |
|------|--------|
| Bronze | 0-499 |
| Silver | 500-999 |
| Gold | 1000-2499 |
| Platinum | 2500+ |

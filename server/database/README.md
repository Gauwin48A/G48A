## Database Setup

This directory contains the SQL scripts for setting up the application's database.

### Scripts

- **01_tables_and_alter.sql**: Creates all tables, relationships, constraints, and indexes required for the application.
- **02_functions_triggers_procedures.sql**: Defines all database functions, triggers, and stored procedures for business logic, validation, audit logging, recommendations, rewards, and notifications.
- **03_dml_realistic_data.sql**: Populates the database with realistic sample data for users (50+), posts, channels, categories, rewards, audit logs, notifications, recommendations, etc.

### Data Population Steps

To set up and populate the database with realistic data:

1. Run `01_tables_and_alter.sql` to create all tables and indexes (including audit, login_audit, recommendations, profiles, etc.).
2. Run `02_functions_triggers_procedures.sql` for all database functions, triggers, and procedures.
3. Run `03_dml_realistic_data.sql` for realistic Indian users, profiles, Aadhaar, channels, posts, rewards, audit, login_audit, recommendations, etc.

### Notes
- All migration scripts have been merged here. Do not use `src/db/migrations/`.
- Aadhaar verification is integrated in backend registration/profile flows.
- Rewards endpoint fetches from DB and supports sorting/filtering/high-value ranges.
- Sample data uses Indian names, cities, and plausible Aadhaar numbers.
- All features/pages (Feed, My Feed, All Posts, Profile, Channel Management, Rewards, Audit Logging, Notifications) are supported by the schema and sample data.
- For production, update password hashes and sensitive data as needed.

### Example Entities Covered
- Users, Profiles, Aadhaar
- Posts, Post Images
- Categories, Tiers
- Channels, Channel Followers
- Rewards, Reward Log
- Audit Log, Aadhaar Verification Log
- Sales, Sale Transitions

---

**Deploy these scripts in order for a complete, production-ready database setup.**

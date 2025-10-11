# Database Setup for Full Application

## 1. Run these scripts in order:
- `production_schema.sql` (creates all tables, constraints, indexes)
- `signup_validations.sql` (user registration validation function)
- `validate_post_fields.sql` (post creation validation function)
- `insert_sample_data.sql` (sample data for all features)

## 2. Remove these legacy/unused files:
- posts_schema.sql
- insert_sample_posts.sql
- hybrid_posts_table.sql
- 2025-09-02_post_actions.sql

## 3. All tables and data are now aligned with every page and feature in the app, including:
- users, profiles, categories, posts, post_images, comments, rewards, complaints, notifications, post_actions, transactions, feedback, referral_codes, daily_codes, tiers, dashboard_stats

## 4. All sample data is relational and covers all app workflows.

## 5. For any new feature/page, add a table and sample data here.

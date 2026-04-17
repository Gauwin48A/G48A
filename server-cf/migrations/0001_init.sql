-- MHub D1 schema (SQLite)
-- All timestamps stored as ISO-8601 strings (UTC) for portability.

PRAGMA foreign_keys = ON;

-- ============================================================
-- Users (Google Sign-In only; no passwords stored)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id               TEXT PRIMARY KEY,              -- nanoid
  google_sub       TEXT UNIQUE NOT NULL,          -- Google's stable subject id
  email            TEXT UNIQUE NOT NULL,
  email_verified   INTEGER NOT NULL DEFAULT 0,
  full_name        TEXT,
  picture_url      TEXT,
  role             TEXT NOT NULL DEFAULT 'viewer' -- 'viewer' | 'seller' | 'admin'
                     CHECK (role IN ('viewer','seller','admin')),
  kyc_status       TEXT NOT NULL DEFAULT 'none'   -- 'none' | 'pending' | 'verified' | 'rejected'
                     CHECK (kyc_status IN ('none','pending','verified','rejected')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at     TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_kyc ON users(kyc_status);

-- ============================================================
-- Categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  icon_url    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);

-- ============================================================
-- Posts
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     TEXT REFERENCES categories(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  price           REAL,
  currency        TEXT NOT NULL DEFAULT 'INR',
  location        TEXT,
  image_urls      TEXT NOT NULL DEFAULT '[]',  -- JSON array of https URLs
  status          TEXT NOT NULL DEFAULT 'published'
                    CHECK (status IN ('draft','published','sold','removed')),
  view_count      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

-- Full-text search (FTS5) on title + description
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  title, description, content='posts', content_rowid='rowid'
);
CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
  INSERT INTO posts_fts(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;
CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
END;
CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
  INSERT INTO posts_fts(rowid, title, description) VALUES (new.rowid, new.title, new.description);
END;

-- ============================================================
-- Wishlist
-- ============================================================
CREATE TABLE IF NOT EXISTS wishlist (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id     TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, post_id)
);

-- ============================================================
-- KYC submissions
-- ============================================================
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL DEFAULT 'mock',  -- 'mock' | 'hyperverge' | 'digio' | 'karza'
  provider_ref     TEXT,                          -- external provider reference id
  doc_type         TEXT NOT NULL,                 -- 'aadhaar' | 'pan' | 'passport' | 'driving_license'
  doc_number_masked TEXT,                         -- last 4 digits only
  doc_front_key    TEXT,                          -- R2 object key (private bucket)
  doc_back_key     TEXT,
  selfie_key       TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','verified','rejected','expired')),
  rejection_reason TEXT,
  submitted_at     TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at      TEXT,
  reviewer_id      TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_submissions(status);

-- ============================================================
-- Audit log (lightweight)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,
  action      TEXT NOT NULL,
  metadata    TEXT,                               -- JSON
  ip          TEXT,
  ua          TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

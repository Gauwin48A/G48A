-- 025_cms_pages.sql
-- Adds the cms_pages table backing GET /api/cms/pages/:slug
-- (referenced by Mhub/server/src/controllers/cmsController.js).
-- Without this table the controller throws "relation cms_pages does not exist"
-- and clients see 500 errors on /category-hub, /subcategories, /payment, etc.

CREATE TABLE IF NOT EXISTS cms_pages (
    slug         text PRIMARY KEY,
    content      jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active    boolean NOT NULL DEFAULT true,
    updated_at   timestamptz NOT NULL DEFAULT now(),
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cms_pages_active ON cms_pages (is_active) WHERE is_active = true;

-- Seed minimal placeholder content so the discovery & checkout pages render
-- their CMS slots gracefully out-of-the-box. Production CMS edits override these.
INSERT INTO cms_pages (slug, content, is_active) VALUES
    ('category-hub',   '{}'::jsonb, true),
    ('subcategories',  '{}'::jsonb, true),
    ('payment',        '{}'::jsonb, true),
    ('home',           '{}'::jsonb, true),
    ('all-posts',      '{}'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;

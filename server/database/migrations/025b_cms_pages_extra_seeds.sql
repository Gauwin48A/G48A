-- 025b_cms_pages_extra_seeds.sql
-- Seeds additional CMS page slugs needed for static/legal pages, offers, invite, 404.

INSERT INTO cms_pages (slug, content, is_active) VALUES
    ('terms-and-conditions',   '{}'::jsonb, true),
    ('privacy-policy',         '{}'::jsonb, true),
    ('refund-policy',          '{}'::jsonb, true),
    ('support-ticket-policy',  '{}'::jsonb, true),
    ('offers',                 '{}'::jsonb, true),
    ('invite-redirect',        '{}'::jsonb, true),
    ('not-found',              '{}'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;

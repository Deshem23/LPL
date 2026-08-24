-- Single-row site configuration table backing the admin Settings page,
-- which previously only held local React state and never persisted
-- anything (handleSave() was `await sleep(1000); toast(success)`, no API
-- call at all). One fixed row (id = 1) is simpler than a key/value table
-- for a handful of well-known settings and keeps reads/writes a single
-- round trip.

CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,

  -- General
  site_name TEXT NOT NULL DEFAULT 'Les Pages Libres',
  site_description TEXT,
  site_url TEXT,
  default_language TEXT DEFAULT 'fr',
  timezone TEXT DEFAULT 'Europe/Paris',
  articles_per_page INTEGER DEFAULT 12,
  comments_enabled BOOLEAN DEFAULT true,
  registration_enabled BOOLEAN DEFAULT true,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  robots_txt TEXT,
  sitemap_enabled BOOLEAN DEFAULT true,

  -- Email / SMTP
  smtp_host TEXT,
  smtp_port TEXT,
  smtp_user TEXT,
  smtp_password TEXT,
  from_email TEXT,
  from_name TEXT,
  enable_notifications BOOLEAN DEFAULT true,

  -- Security policy (stored preferences - not yet enforced anywhere else
  -- in the app; see the note left in settings-service.ts)
  session_timeout INTEGER DEFAULT 120,
  max_login_attempts INTEGER DEFAULT 5,
  password_min_length INTEGER DEFAULT 8,
  require_special_chars BOOLEAN DEFAULT true,
  require_numbers BOOLEAN DEFAULT true,
  require_uppercase BOOLEAN DEFAULT true,
  two_factor_enabled BOOLEAN DEFAULT false,
  backup_enabled BOOLEAN DEFAULT false,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,

  CONSTRAINT site_settings_singleton CHECK (id = 1)
);

INSERT INTO site_settings (
  id, site_name, site_description, site_url,
  meta_title, meta_description, meta_keywords, robots_txt,
  from_email, from_name
)
VALUES (
  1,
  'Les Pages Libres',
  'Votre source de confiance pour l''actualité locale, internationale et de niche.',
  'https://lespageslibres.com',
  'Les Pages Libres - Votre source d''information',
  'Votre source de confiance pour l''actualité locale, internationale et de niche.',
  'actualité, news, information, journal, Les Pages Libres',
  E'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/',
  'noreply@lespageslibres.com',
  'Les Pages Libres'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Settings are viewable by everyone" ON site_settings;
CREATE POLICY "Settings are viewable by everyone"
  ON site_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can update settings" ON site_settings;
CREATE POLICY "Only admins can update settings"
  ON site_settings FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');

NOTIFY pgrst, 'reload schema';

-- Ads system. Replaces the 100%-mock ad-service.ts with a real table so
-- ads created/edited in the admin dashboard actually persist and can be
-- served to the public site by placement.

CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT NOT NULL,
  -- banner | sidebar | in-article | popup | video | text | sponsored | link
  type TEXT NOT NULL DEFAULT 'banner',
  -- top | middle | bottom | sidebar | in-article | footer
  placement TEXT NOT NULL DEFAULT 'top',
  -- active | inactive | scheduled
  status TEXT NOT NULL DEFAULT 'inactive',
  is_text_only BOOLEAN NOT NULL DEFAULT false,
  text_content TEXT,
  sponsor_name TEXT,
  button_text TEXT,
  background_color TEXT,
  text_color TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  view_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ads_placement_status ON ads (placement, status);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads (status);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Public (anon key) can only ever see ads that are actively running today.
-- The admin dashboard reads/writes through the service-role key, which
-- bypasses RLS entirely, so this policy only constrains the public site.
DROP POLICY IF EXISTS "Public can view active ads" ON ads;
CREATE POLICY "Public can view active ads" ON ads
  FOR SELECT
  USING (
    status = 'active'
    AND (start_date IS NULL OR start_date <= CURRENT_DATE)
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  );

-- Idempotent repair for the `ads` table. Run this if you saw an error
-- like "Could not find the 'click_count' column of 'ads' in the schema
-- cache" (or any other ads column) when creating an ad.
--
-- Why this happens: 04_create_ads_table.sql uses
-- `CREATE TABLE IF NOT EXISTS ads (...)`, which does nothing at all if a
-- table named `ads` already exists - even if that existing table is
-- missing columns (e.g. from an earlier partial run of the migration).
-- This script instead adds each column individually with
-- `ADD COLUMN IF NOT EXISTS`, so it repairs whatever is actually there
-- right now, regardless of how it got into that state. Safe to run as
-- many times as you like.

CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE ads ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE ads ALTER COLUMN title SET NOT NULL;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE ads ALTER COLUMN link_url SET NOT NULL;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'banner';
ALTER TABLE ads ADD COLUMN IF NOT EXISTS placement TEXT NOT NULL DEFAULT 'top';
ALTER TABLE ads ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'inactive';
ALTER TABLE ads ADD COLUMN IF NOT EXISTS is_text_only BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS text_content TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS sponsor_name TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS button_text TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS background_color TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS text_color TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS click_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE ads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_ads_placement_status ON ads (placement, status);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads (status);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active ads" ON ads;
CREATE POLICY "Public can view active ads" ON ads
  FOR SELECT
  USING (
    status = 'active'
    AND (start_date IS NULL OR start_date <= CURRENT_DATE)
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  );

-- Force PostgREST to pick up the (possibly changed) schema immediately,
-- instead of waiting for its next automatic cache refresh.
NOTIFY pgrst, 'reload schema';

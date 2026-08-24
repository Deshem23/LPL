-- Upgrades ads from a flat array of image URLs to a richer per-slide
-- structure: each slide (image or video) can carry its own title,
-- description, and destination link, independent of the ad's own
-- title/description/linkUrl.
--
-- The old `images TEXT[]` column (from 06_add_ad_images_array.sql) is
-- left in place for backward compatibility with any ad saved before this
-- migration - the app prefers `media` when it's non-empty and falls back
-- to `images`/`image_url` otherwise.

ALTER TABLE ads ADD COLUMN IF NOT EXISTS media JSONB NOT NULL DEFAULT '[]';

NOTIFY pgrst, 'reload schema';

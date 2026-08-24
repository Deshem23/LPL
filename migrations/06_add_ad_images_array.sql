-- Lets a single ad hold multiple images that carousel/fade between each
-- other, instead of just one image per ad. `image_url` is kept for
-- backward compatibility (older rows, or a single-image ad) - the app
-- prefers `images` when it's non-empty and falls back to `image_url`
-- otherwise.

ALTER TABLE ads ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';

NOTIFY pgrst, 'reload schema';

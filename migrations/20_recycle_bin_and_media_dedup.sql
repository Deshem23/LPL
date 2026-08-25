-- ============================================
-- RECYCLE BIN (media, articles, users) + MEDIA DEDUPLICATION
-- ============================================
-- Adds soft-delete to the three entities the admin explicitly asked to
-- be able to recover after deleting: media, articles, users. A row with
-- deleted_at set is "in the trash" - hidden from every normal listing,
-- but still in the table, until it's either restored (deleted_at cleared)
-- or permanently deleted (the actual DELETE, now only reachable from the
-- trash view) or auto-purged 30 days after being trashed.
--
-- Also adds content_hash to `media`, so the upload endpoint can detect
-- "this exact file was already uploaded" and reuse the existing row
-- instead of creating a duplicate file + row every time.
-- ============================================

ALTER TABLE media ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Every normal listing query now filters `deleted_at IS NULL` - this
-- index keeps that filter (plus the trash view's `IS NOT NULL` scan)
-- cheap instead of a full table scan as each table grows.
CREATE INDEX IF NOT EXISTS idx_media_deleted_at ON media(deleted_at);
CREATE INDEX IF NOT EXISTS idx_articles_deleted_at ON articles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- SHA-256 hex digest of the uploaded file's bytes. NULL for any row
-- uploaded before this migration (those are simply never matched as
-- duplicates of anything, which is correct - dedup only applies going
-- forward). The partial unique index (WHERE deleted_at IS NULL) means a
-- file can be re-uploaded cleanly once its only prior copy is trashed -
-- dedup only ever matches against media that's still actually in use.
ALTER TABLE media ADD COLUMN IF NOT EXISTS content_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_content_hash_active
  ON media(content_hash)
  WHERE content_hash IS NOT NULL AND deleted_at IS NULL;

-- ============================================
-- VERIFY
-- ============================================
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('media', 'articles', 'users')
  AND column_name IN ('deleted_at', 'content_hash')
ORDER BY table_name, column_name;

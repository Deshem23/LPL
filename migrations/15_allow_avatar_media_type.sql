-- The media table's `type` CHECK constraint (migrations/01_create_tables.sql)
-- only ever allowed 'image' | 'video' | 'audio' | 'gallery' | 'podcast'.
-- But the upload route (src/app/api/media/upload/route.ts) has always
-- inserted type='avatar' for profile-picture uploads - both the
-- self-service /admin/profile page and the admin's "Edit User" dialog
-- send `type: 'avatar'` in the upload FormData. Every single avatar
-- upload has therefore always failed this CHECK constraint at the
-- database level. The API route silently swallowed that failure
-- (console.error + continue) and still returned HTTP 200 with an empty
-- media array, so the browser only ever saw a generic "upload failed"
-- toast with no real cause - this is what was still broken even after
-- creating the missing "media" storage bucket (migration 08), since that
-- fixed the storage half but not this separate database-constraint half.
--
-- Postgres auto-named this constraint media_type_check (the standard
-- <table>_<column>_check pattern for an inline CHECK) - confirmed by
-- running this migration, since re-adding a constraint under that exact
-- name is what failed with "already exists". Drop it by that known name
-- and replace it with one that also allows 'avatar'.
ALTER TABLE media DROP CONSTRAINT IF EXISTS media_type_check;

ALTER TABLE media
  ADD CONSTRAINT media_type_check
  CHECK (type IN ('image', 'video', 'audio', 'gallery', 'podcast', 'avatar'));

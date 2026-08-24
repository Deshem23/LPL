-- Backs the "first login after an admin-created account" flow: an admin
-- creating a user via the admin panel sets a generic/temporary password,
-- and that user must change it (and can fill in their author profile)
-- before reaching their dashboard. Self-registered users and Google
-- OAuth sign-ins pick their own password/never have one, so they default
-- to false - they're never gated by this.
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';

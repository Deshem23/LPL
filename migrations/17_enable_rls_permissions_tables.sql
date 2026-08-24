-- ============================================
-- ENABLE RLS ON REFERENCE/LOOKUP TABLES
-- ============================================
-- permissions, role_permissions, and article_status were created by
-- migration 02 and 01 without ROW LEVEL SECURITY ever being turned on.
-- Every other table in this schema has RLS enabled (see 01_create_tables.sql),
-- so these three were silently reachable by ANY caller holding the anon
-- key via PostgREST - not just read, but INSERT/UPDATE/DELETE too, since
-- an RLS-disabled table has no policies to restrict against.
--
-- In practice the app never queries these three tables from the client
-- (the current permission matrix is hardcoded in src/lib/auth/permissions.ts,
-- and article_status.can_transition_to isn't enforced anywhere yet - see
-- the "Recommended Roadmap" item about wiring up real state-machine
-- enforcement). That makes this pass low-risk to run: nothing in the
-- running app depends on these tables being reachable from the browser.
--
-- Policy shape mirrors categories/article_status style already used
-- elsewhere in this schema: readable by everyone (they're reference data,
-- not sensitive), writable by admins only.
-- ============================================

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permissions are viewable by everyone"
  ON permissions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage permissions"
  ON permissions FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');


ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role permissions are viewable by everyone"
  ON role_permissions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage role permissions"
  ON role_permissions FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');


ALTER TABLE article_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Article statuses are viewable by everyone"
  ON article_status FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage article statuses"
  ON article_status FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');


-- ============================================
-- VERIFY
-- ============================================
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('permissions', 'role_permissions', 'article_status');

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('permissions', 'role_permissions', 'article_status')
ORDER BY tablename, cmd;

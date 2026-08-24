-- ============================================
-- FIX: auth.users / public.users DRIFT
-- ============================================
-- Two related bugs found while investigating "I have existing users that
-- don't show up in my Users list":
--
-- 1. BACKFILL GAP. handle_new_user() (migrations/01_create_tables.sql)
--    only ever runs for a NEW row inserted into auth.users - it does
--    nothing for accounts that already existed before the trigger was
--    created. Any account created earlier (almost certainly your own
--    admin account, since it would have been this project's very first
--    signup, and possibly others created around the same time) can log
--    in completely normally - auth.users has their record - but has no
--    matching row in public.users. Every part of the app that lists,
--    searches, or displays users (getAllUsers(), the Users admin page,
--    audit log filters, article bylines) reads ONLY public.users, so
--    these accounts are invisible everywhere in the UI despite being
--    fully valid, working logins. This is also why such an account's
--    role kept falling back to a default instead of showing its real
--    role - see PART 1 below, which fixes both at once.
--
-- 2. NO ERROR HANDLING. handle_new_user() does a bare INSERT with no
--    exception handling and no ON CONFLICT clause, into a table where
--    `email` is UNIQUE NOT NULL. Since this is an AFTER INSERT trigger
--    on auth.users, any failure inside it (a duplicate email from a
--    second identity/provider signing up under an email that already
--    has a public.users row, a null name Postgres can't satisfy, etc.)
--    doesn't just skip the profile row - it raises an exception that
--    ROLLS BACK THE ENTIRE TRANSACTION, including the parent INSERT
--    into auth.users. That means the failure mode isn't "missing
--    profile, but you can still log in" - it's "the signup/OAuth
--    linking itself silently fails with no visible error". PART 2 below
--    makes profile creation best-effort: it can no longer take down
--    account creation, and a conflicting email is skipped instead of
--    aborting.
-- ============================================

-- ============================================
-- PART 1: BACKFILL - create the missing public.users row for every
-- auth.users account that doesn't have one yet. Uses each account's own
-- signup metadata (name/role) exactly the same way the trigger would
-- have, so this is a one-time catch-up, not a behavior change.
-- ============================================
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'role', 'contributor'),
  COALESCE(au.created_at, NOW()),
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
-- Belt-and-suspenders: if two auth.users rows somehow share an email
-- (see PART 2's comment on account linking), only the first one wins the
-- public.users row rather than erroring the whole backfill.
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- PART 2: HARDEN THE TRIGGER - same INSERT as before, but wrapped so a
-- conflicting email is skipped (not fatal) and any other unexpected
-- error is logged and swallowed instead of rolling back the auth.users
-- insert that triggered it. Account creation must always win over
-- profile-row bookkeeping.
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'contributor')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never let a profile-row problem (duplicate email from a second
  -- identity/provider, unexpected constraint, etc.) block the actual
  -- auth.users signup/OAuth linking that fired this trigger.
  RAISE WARNING 'handle_new_user: could not create public.users row for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFY
-- ============================================
-- Should return 0 rows once the backfill above has run.
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;

-- Sanity check: the two accounts mentioned in this investigation should
-- now both appear.
SELECT id, email, name, role, created_at
FROM public.users
WHERE email ILIKE '%shilleremmanueld%' OR email ILIKE '%shilleremmanuel.desrosiers%';

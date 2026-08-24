# Deployment Checklist — Les Pages Libres

This covers everything from the "Recommended Roadmap" (Section 12 of the technical
documentation PDF) that could be implemented directly in your codebase from this session,
plus the steps that only you can run — this session has no network path to Supabase, npm's
registry beyond what's already installed, or any hosting provider, so migrations, type
generation, and the actual deploy all need to happen on your end.

## What was done this session

**Immediate (roadmap items 1–3):**
- Added real 401/403 auth guards to all 8 previously-unprotected routes: category
  create/update/delete, user list/create/update/delete, media list/get/update/delete,
  and admin stats/analytics. Every one of these previously let the mutation proceed
  regardless of authentication — the fix is `src/lib/auth/require-permission.ts`
  (`requireAuth()` / `requirePermission()`), backed by a new DB-authoritative
  `getCurrentUserWithRole()` in `src/lib/auth/actions.ts`.
- `migrations/17_enable_rls_permissions_tables.sql` — enables RLS on `permissions`,
  `role_permissions`, `article_status` (previously wide open to any caller with the anon key).
- `docs/PRODUCTION_ENV_CHECKLIST.md` — every environment variable this app needs in
  production and where to get it.

**Near-term (roadmap items 4–8):**
- `hasPermission()` is now the live authorization mechanism behind every route guard above
  (item 4). The two unused competing permission systems — `src/lib/auth/roles.ts` +
  `role-switcher.tsx`, and `auth-guard.tsx` — were confirmed to have zero other importers
  and moved to `_to_delete/` (item 4's cleanup half).
- Item 5 (regenerate real Supabase TS types) is **not done** — this session cannot reach
  your Supabase project's network to run `npx supabase gen types typescript`. See below.
- `.github/workflows/ci.yml` content was prepared (typecheck + lint + build on every
  push/PR) but **could not be written directly** — `.github/workflows/` is a protected
  path for remote-tool writes. It was delivered to you as a file; copy it into
  `.github/workflows/ci.yml` yourself to activate CI. `cd.yml`, `deploy.yml`, and
  `test.yml` were left as-is (empty) — Vercel's own git integration deploys without
  needing a GitHub Actions workflow, and there's no test framework wired up yet for
  `test.yml` to run anything real.
- The three duplicate locale-config files were consolidated to one source of truth
  (`src/i18n/config.ts`) — the 8 files importing the old `src/lib/i18n/config.ts` were
  repointed, and both duplicates were moved to `_to_delete/`.
- The full dead-code inventory (empty middleware stub directories, orphaned service/API
  stub files, unused components, the orphaned `es.json` locale file, stale `.next-stale-*`
  build caches, and loose root diagnostic files) was moved to `_to_delete/` at the project
  root — see "Cleanup" below.

**Medium-term (roadmap items 9 and 11):**
- `migrations/18_atomic_counters.sql` + updated `article-service.ts`/`ad-service.ts` —
  view/click counters now increment atomically via Postgres RPC instead of racy
  read-then-write (item 9).
- Basic in-memory rate limiting added to `/api/auth/login` (10/5min), `/api/auth/register`
  (5/hour), and `/api/contact` (5/hour) — see the caveat in `src/lib/rate-limit.ts` about
  this being process-local, not shared across serverless instances (item 11).
- Item 10 (article status state-machine enforcement, real audit-log-backed activity feed)
  and item 12 (wiring up the `tests/` scaffolding) were deliberately left out of this pass —
  both are larger design decisions rather than mechanical fixes, flagged in the original
  documentation as lower priority.

All of the above passed `npx tsc --noEmit -p .` and `npx next lint` clean after every
change (only pre-existing `react-hooks/exhaustive-deps` warnings remain, unrelated to
this work).

## What you need to do before deploying

1. **Run the migrations.** In the Supabase SQL Editor, run `migrations/17_enable_rls_permissions_tables.sql`
   then `migrations/18_atomic_counters.sql` (in that order — 18 doesn't depend on 17, but
   keep migration numbering sequential). Both are idempotent-safe to review before running.

2. **Set production environment variables.** Follow `docs/PRODUCTION_ENV_CHECKLIST.md` —
   set every "Required" variable on your hosting platform's dashboard before the first
   deploy, not after.

3. **Regenerate real Supabase types (roadmap item 5).** This session couldn't reach your
   Supabase project, so the app still has no generated types file. Run this yourself:
   ```
   npx supabase gen types typescript --project-id <your-project-id> > src/types/supabase.ts
   ```
   Wiring the generated `Database` type into the four Supabase client constructors
   (`client.ts`, `server.ts`, `middleware.ts`, `admin.ts`) is a separate follow-up — it'll
   surface any places where code assumes a column/table that doesn't actually match the
   live schema.

4. **Add `ci.yml` to `.github/workflows/`.** Delivered as a file this session — place it at
   `.github/workflows/ci.yml` to get a typecheck+lint+build gate on every PR.

5. **Run a full production build yourself**: `npm run build`. This session's tools couldn't
   complete one (45-second execution cap, no persistent background processes) — `tsc --noEmit`
   and `next lint` both pass clean, which catches most build blockers, but a real
   `next build` is the only way to catch anything build-specific (e.g. an env var that's
   only read at build time).

6. **Review and delete `_to_delete/`.** Everything moved out of the active codebase this
   session — dead middleware stubs, the two unused permission systems, duplicate i18n
   configs, unused components, stale `.next-stale-*` build caches, and loose root
   diagnostic files — is sitting in this one folder at the project root. The device bridge
   used this session can't delete files (only move them), so review the folder and delete
   it yourself once you're satisfied nothing in it is needed.

7. **Deploy.** Given `@vercel/og` as a dependency and an (empty) `vercel.json`, Vercel looks
   like the intended target — import the repo in the Vercel dashboard, set the env vars
   from step 2, and deploy. If you're going a different route (the empty `Dockerfile`/
   `docker-compose.yml`/`nginx.conf` suggest that was considered too), those three files
   are currently empty placeholders and will need real content before a container build
   would work.

## Not addressed (flagged, not fixed)

- **Role-boundary drift between RLS, `middleware.ts`, and `permissions.ts`.** These three
  authority sources don't fully agree on role boundaries in every case (e.g. categories
  management: RLS/middleware treat it as admin-only, `permissions.ts` grants it to editors
  too). The route guards added this session close the "no check at all" holes, which was
  the priority, but a full reconciliation of exact role boundaries across all three systems
  is still open.
- **Article status transitions** (`article_status.can_transition_to`) aren't enforced
  anywhere in the app logic — the data exists but nothing checks it on a status change.
- **The real activity feed** — the admin dashboard's "recent activity" is still derived
  from `articles.updated_at` rather than a proper audit-log-backed feed.
- **`tests/` scaffolding** is still unwired — no `test` script in `package.json`, no test
  framework fully configured.

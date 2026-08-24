# Production Environment Variables Checklist

`.env.production` and `.env.development` are both present but empty (0 bytes) in this
project, and `.env.local` (used for local dev only, not deployed) is the only file that
currently holds real values. Before deploying, every variable below needs a real
production value set on the hosting platform's dashboard (e.g. Vercel → Project →
Settings → Environment Variables, scoped to "Production"). Do **not** commit real
secrets into `.env.production` in git — set them in the platform's dashboard instead;
`.env.production` should stay a template/reference only if you keep it in the repo at all.

## Required

| Variable | Used for | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Canonical site URL — used for OAuth redirects, password-reset links, sitemap generation (`next-sitemap.config.js`), and email links | Your production domain, e.g. `https://lespageslibres.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client + server) | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (client + server, RLS-scoped) | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key — bypasses RLS entirely (used by `src/lib/supabase/admin.ts`). **Never expose this with a `NEXT_PUBLIC_` prefix or ship it to the client.** | Supabase Dashboard → Project Settings → API → `service_role` secret |
| `NEXTAUTH_SECRET` | Session/cookie signing secret | Generate a fresh random value for production — do not reuse the dev one. `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Same as `NEXT_PUBLIC_APP_URL`, production domain | Your production domain |

## Required if Google sign-in is used

| Variable | Used for | Where to get it |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth (`signInWithGoogle()` in `actions.ts`) | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Same as above |

Also add the production callback URL (`https://<your-domain>/auth/callback`) to the
OAuth client's Authorized Redirect URIs in the Google Cloud Console, and to Supabase's
Auth → URL Configuration → Redirect URLs.

## Required if outbound email is used

| Variable | Used for | Where to get it |
|---|---|---|
| `RESEND_API_KEY` | Transactional email (`sendMail()` in `src/lib/email/mailer.ts`) — welcome emails, password resets, contact form | Resend Dashboard → API Keys |

`sendMail()` fails soft (logs and continues) if this is missing, so the app won't crash
without it — but welcome emails and password-reset emails silently won't send.

## Required for on-demand revalidation webhooks

| Variable | Used for | Where to get it |
|---|---|---|
| `REVALIDATE_SECRET` | Shared secret validating calls to the revalidation webhook route | Generate a random string — `openssl rand -hex 32` |
| `SUPABASE_WEBHOOK_SECRET` | Shared secret validating calls to the Supabase DB webhook route | Generate a random string; configure the matching value on the Supabase Database Webhook itself |

If you wire up Supabase Database Webhooks to call these routes on row changes, the
webhook's configured secret and this env var must match exactly.

## Optional

| Variable | Used for | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics | Google Analytics Admin → Data Streams |
| `VERCEL_URL` | Set automatically by Vercel at build/runtime — do not set manually | N/A (Vercel-provided) |

## Platform-specific notes (Vercel)

`vercel.json` and the `Dockerfile`/`docker-compose.yml`/`nginx.conf` in this repo are all
currently empty (0 bytes), and `@vercel/og` is a dependency — this points at Vercel being
the intended host rather than a custom Docker deployment. If that's still the plan:

1. Import the repo in the Vercel dashboard (or `vercel link` from the CLI).
2. Add every "Required" variable above under Project Settings → Environment Variables,
   scoped to Production (and Preview, if you want preview deployments to hit a real —
   ideally staging, not production — Supabase project).
3. Set the project's custom domain, then update `NEXT_PUBLIC_APP_URL` / `NEXTAUTH_URL`
   to match it exactly (including `https://`, no trailing slash).
4. If you don't actually plan to containerize this, the empty `Dockerfile`,
   `docker-compose.yml`, and `nginx.conf` are dead placeholders and can be deleted in the
   cleanup pass (roadmap item 8 / Task tracking this session's item #39).

## Before going live

- Confirm `SUPABASE_SERVICE_ROLE_KEY` is set only as a server-side environment variable
  on the hosting platform — grep your client bundle output for it if unsure.
- Rotate `NEXTAUTH_SECRET` to a value that has never been used in development or shared
  in any doc/chat.
- Double-check Supabase Auth → URL Configuration has the production domain in both
  "Site URL" and "Redirect URLs" (login/OAuth will silently redirect to `localhost`
  otherwise).

/**
 * Basic in-memory, fixed-window rate limiter.
 *
 * Roadmap item: add rate limiting to /api/auth/login, /api/auth/register,
 * and /api/contact - none of the three had any limit before this, so a
 * single caller could hammer login with unlimited password guesses,
 * spam account creation, or flood the contact-form mailer.
 *
 * IMPORTANT CAVEAT: this state lives in the Node process's memory. That's
 * fine on a single long-running server (e.g. `next start` on a VPS/
 * Docker host - state persists across requests to that one process), but
 * on a multi-instance serverless platform (Vercel's default deployment
 * model) each function instance has its own memory, so a caller's
 * requests can land on different instances and this won't share counts
 * between them - it becomes "rate limit per instance" rather than a true
 * global limit, and every cold start resets it to zero. That's still
 * strictly better than no limit at all, but if this app scales past a
 * single instance in production, replace this with a shared store (e.g.
 * Upstash Redis, which has a maintained @upstash/ratelimit package built
 * for exactly this) so the counter is consistent across instances.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so `buckets` doesn't grow forever under many
// distinct IPs - sweeps expired entries every 200 calls rather than on
// every single call.
let callsSinceSweep = 0;
function maybeSweep() {
  callsSinceSweep += 1;
  if (callsSinceSweep < 200) return;
  callsSinceSweep = 0;
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Check and consume one request against `key`'s limit.
 * @param key Unique identifier for the caller + route, e.g. `login:1.2.3.4`
 * @param limit Max requests allowed per window
 * @param windowMs Window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  maybeSweep();

  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/**
 * Best-effort client IP extraction for rate-limit keying. Trusts
 * x-forwarded-for (set by Vercel and most reverse proxies) - falls back
 * to a constant so callers behind a proxy that doesn't set it still
 * share a single (weaker, but non-crashing) bucket instead of throwing.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

/**
 * Convenience helper for route handlers: returns a ready-to-return 429
 * NextResponse-shaped plain object when the caller is over the limit, or
 * null when the request is allowed to proceed. Route handlers still need
 * to import NextResponse themselves to build the actual response, since
 * this lib file intentionally has no next/server dependency.
 */
export function checkRateLimit(
  routeKey: string,
  request: Request,
  limit: number,
  windowMs: number
): RateLimitResult & { key: string } {
  const ip = getClientIp(request);
  const key = `${routeKey}:${ip}`;
  return { ...rateLimit(key, limit, windowMs), key };
}

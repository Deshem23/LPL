import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';
import { locales, defaultLocale } from './i18n/config';

// ============================================
// 1. LOCALE HANDLING FUNCTIONS
// ============================================

/**
 * Get the preferred locale from the request
 */
function getLocale(request: NextRequest): string {
  // Check if there's a locale in the path
  const pathname = request.nextUrl.pathname;
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    // Extract the locale from the path
    const locale = locales.find(
      (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );
    return locale || defaultLocale;
  }

  // If no locale in path, check browser language preference
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferredLocale = locales.find(locale =>
      acceptLanguage.toLowerCase().includes(locale.toLowerCase())
    );
    if (preferredLocale) {
      return preferredLocale;
    }
  }

  return defaultLocale;
}

// ============================================
// 2. AUTH PROTECTION FUNCTIONS
// ============================================

/**
 * Check if path is public (no auth required)
 */
function isPublicPath(pathname: string): boolean {
  // The admin panel lives at /lpl-access-2026/panel/** on disk - nested
  // under the SAME /lpl-access-2026 segment as the public login page. That
  // means the "nested route" prefix check below would otherwise also match
  // every admin panel path (e.g. /lpl-access-2026/panel/settings) as
  // "public", since it literally starts with '/lpl-access-2026/'. STEP 4A
  // in the main middleware function checks isPublicPath() before STEP 4C
  // checks isAdminPath() and returns early once it matches - so with this
  // bug, EVERY admin panel request was hitting STEP 4A, never reaching
  // STEP 4A's own redirect condition (pathname is never exactly
  // '/lpl-access-2026'), and falling through to `return supabaseResponse`
  // - which let the request through with NO auth check and NO role check
  // at all, regardless of whether `user` was even set. Excluded explicitly
  // here so admin paths always fall through to STEP 4C instead, where the
  // real auth+role gating lives.
  if (isAdminPath(pathname)) {
    return false;
  }

  const publicPaths = [
    '/lpl-access-2026',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/auth/callback',
    '/',
  ];

  // Check exact matches
  if (publicPaths.includes(pathname)) {
    return true;
  }

  // Check if path starts with any public path (for nested routes)
  return publicPaths.some(path => pathname.startsWith(path + '/'));
}

/**
 * The first-login "change your generic password / complete your author
 * profile" page. Requires auth like an admin path, but isn't under
 * /admin and has no role restriction - anyone who's logged in lands here
 * exactly once (until they submit it), regardless of role.
 */
function isCompleteProfilePath(pathname: string): boolean {
  return pathname === '/complete-profile';
}

/**
 * Check if path is an admin route
 */
function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/lpl-access-2026/panel');
}

/**
 * Check if path is the unauthorized page (also lives outside [locale] on
 * disk, at src/app/unauthorized/page.tsx).
 */
function isUnauthorizedPath(pathname: string): boolean {
  return pathname === '/unauthorized' || pathname.startsWith('/unauthorized/');
}

/**
 * Every route that lives outside src/app/[locale] on disk and must
 * therefore never get a /<locale> prefix added - regardless of whether
 * it requires auth. isPublicPath() only covers "no auth required" paths;
 * /complete-profile and /unauthorized both need auth (checked further
 * down) but still have to be exempted here too, or STEP 3 below redirects
 * them to e.g. /fr/complete-profile, which doesn't exist - a real bug
 * this middleware had until this check was split out.
 */
function isLocaleExemptPath(pathname: string): boolean {
  return (
    isPublicPath(pathname) ||
    isAdminPath(pathname) ||
    isCompleteProfilePath(pathname) ||
    isUnauthorizedPath(pathname)
  );
}

/**
 * Check if path is an API route
 */
function isApiPath(pathname: string): boolean {
  return pathname.startsWith('/api');
}

/**
 * Check if path is a static asset
 */
function isStaticPath(pathname: string): boolean {
  const staticPatterns = [
    '/_next',
    '/favicon.ico',
    '/manifest.json',
    '/icons',
    '/images',
    '/fonts',
    '/logo'
  ];
  return staticPatterns.some(pattern => pathname.startsWith(pattern));
}

/**
 * Get allowed roles for a specific admin route
 */
function getAllowedRolesForPath(pathname: string): string[] | null {
  const roleMap: Record<string, string[]> = {
    '/lpl-access-2026/panel/settings': ['admin'],
    '/lpl-access-2026/panel/users': ['admin'],
    '/lpl-access-2026/panel/categories': ['admin'],
    '/lpl-access-2026/panel/audit-log': ['admin'],
    '/lpl-access-2026/panel/reports': ['admin'],
    '/lpl-access-2026/panel/ads': ['admin', 'editor'],
    '/lpl-access-2026/panel/analytics': ['admin', 'editor', 'writer'],
    '/lpl-access-2026/panel/editor': ['admin', 'editor'],
    '/lpl-access-2026/panel/writer': ['admin', 'editor', 'writer'],
    '/lpl-access-2026/panel/contributor': ['admin', 'editor', 'writer', 'contributor'],
    '/lpl-access-2026/panel/media': ['admin', 'editor', 'writer'],
  };

  // Check exact match
  if (roleMap[pathname]) {
    return roleMap[pathname];
  }

  // Check prefix matches
  for (const [route, roles] of Object.entries(roleMap)) {
    if (pathname.startsWith(route)) {
      return roles;
    }
  }

  // Default: all authenticated users can access /admin
  if (pathname === '/lpl-access-2026/panel') {
    return ['admin', 'editor', 'writer', 'contributor'];
  }

  return null;
}

// ============================================
// 3. MAIN MIDDLEWARE
// ============================================

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ============================================
  // STEP 1: Skip middleware for static assets
  // ============================================
  if (isStaticPath(pathname)) {
    return NextResponse.next();
  }

  // Get the Supabase client - bound to THIS request/response pair (see
  // lib/supabase/middleware.ts for why that matters: the previous
  // Server-Component-style client here was letting a cookie-less
  // incognito request read back a DIFFERENT, already-authenticated
  // request's session). Runs for every non-static request, API routes
  // included (see STEP 2 and the matcher below) - a stale/expired access
  // token gets refreshed here before it ever reaches a page OR an API
  // route handler.
  const { response: supabaseResponse, supabase, user } = await updateSession(request);

  // Any redirect below still needs to carry forward whatever cookies
  // updateSession() may have refreshed (e.g. a rotated auth token) -
  // NextResponse.redirect() starts a brand-new response object, so those
  // cookies have to be copied onto it explicitly or they'd be dropped.
  const redirectWithCookies = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  };

  // ============================================
  // STEP 2: Handle API routes
  // ============================================
  // Each API route handler does its own getCurrentUser()/role check and
  // returns its own 401/403 - middleware doesn't gate these paths. Its
  // job here is only to make sure the session cookie that handler reads
  // is fresh. This used to be `return NextResponse.next()` with no
  // refresh at all, AND /api/* was excluded from the matcher below
  // entirely, so this whole function never even ran for API requests -
  // a session that was still perfectly valid (refreshable) but had an
  // expired access token (e.g. a long article edit left open past the
  // token's ~1h lifetime) would 401 on save even though a normal page
  // navigation at that same moment would have silently refreshed it.
  if (isApiPath(pathname)) {
    return supabaseResponse;
  }

  // ============================================
  // STEP 3: Handle Locale Redirect
  // ============================================
  // Check if the pathname already has a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // If it's the root path, redirect to default locale
  if (pathname === '/') {
    const url = new URL(`/${defaultLocale}`, request.url);
    return redirectWithCookies(url);
  }

  // If path doesn't have locale and isn't one of the routes that live
  // outside [locale] on disk, add locale.
  if (!pathnameHasLocale && !isLocaleExemptPath(pathname)) {
    const locale = getLocale(request);
    const newUrl = new URL(`/${locale}${pathname}`, request.url);
    return redirectWithCookies(newUrl);
  }

  // ============================================
  // STEP 4: Handle Authentication
  // ============================================

  // ============================================
  // STEP 4A: Public paths (no auth required)
  // ============================================
  if (isPublicPath(pathname)) {
    // If user is already authenticated and tries to access login/register,
    // redirect to admin dashboard (or the first-login gate, if they still
    // haven't changed their generic password).
    if (user && (pathname === '/lpl-access-2026' || pathname === '/register')) {
      const { data: profile } = await supabase
        .from('users')
        .select('must_change_password')
        .eq('id', user.id)
        .single();

      if (profile?.must_change_password) {
        return redirectWithCookies(new URL('/complete-profile', request.url));
      }

      const role = user.user_metadata?.role || 'contributor';
      const redirectPath = getDashboardPath(role);
      return redirectWithCookies(new URL(redirectPath, request.url));
    }
    return supabaseResponse;
  }

  // ============================================
  // STEP 4B: The first-login "complete your profile" page
  // ============================================
  // Needs auth like an admin path, but no role check - every role lands
  // here on their forced first login.
  if (isCompleteProfilePath(pathname)) {
    if (!user) {
      const loginUrl = new URL('/lpl-access-2026', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return redirectWithCookies(loginUrl);
    }
    return supabaseResponse;
  }

  // ============================================
  // STEP 4C: Admin paths (require authentication)
  // ============================================
  if (isAdminPath(pathname)) {
    // If no user, redirect to login
    if (!user) {
      const loginUrl = new URL('/lpl-access-2026', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return redirectWithCookies(loginUrl);
    }

    // An admin-created account with a still-unchanged generic password
    // gets routed to /complete-profile before it can reach any dashboard
    // - checked against the users table (not the JWT), since this flag
    // is meant to flip the moment they submit that page, not wait for a
    // fresh login/token refresh.
    const { data: profile } = await supabase
      .from('users')
      .select('must_change_password')
      .eq('id', user.id)
      .single();

    if (profile?.must_change_password) {
      return redirectWithCookies(new URL('/complete-profile', request.url));
    }

    // Check role-based access
    const userRole = user.user_metadata?.role || 'contributor';
    const allowedRoles = getAllowedRolesForPath(pathname);

    if (allowedRoles && !allowedRoles.includes(userRole)) {
      return redirectWithCookies(new URL('/unauthorized', request.url));
    }

    // User is authenticated and authorized
    return supabaseResponse;
  }

  // ============================================
  // STEP 5: All other paths (public with locale)
  // ============================================
  // Reuse supabaseResponse (not a fresh NextResponse.next()) so any
  // refreshed auth cookies from updateSession() above still reach the
  // browser on ordinary page loads too, not just on the auth-gated paths.
  const locale = pathnameHasLocale
    ? locales.find(l => pathname.startsWith(`/${l}`)) || defaultLocale
    : defaultLocale;
  supabaseResponse.headers.set('x-locale', locale);

  return supabaseResponse;
}

// ============================================
// 4. HELPER FUNCTIONS
// ============================================

function getDashboardPath(role: string): string {
  switch (role) {
    case 'admin':
      return '/lpl-access-2026/panel';
    case 'editor':
      return '/lpl-access-2026/panel/editor';
    case 'writer':
      return '/lpl-access-2026/panel/writer';
    case 'contributor':
      return '/lpl-access-2026/panel/contributor';
    default:
      return '/lpl-access-2026/panel';
  }
}

// ============================================
// 5. CONFIGURATION
// ============================================

export const config = {
  matcher: [
    // API routes used to be excluded here too ("?!api|..."), which meant
    // middleware never ran for them at all - not even to refresh an
    // expiring session cookie (see STEP 2's comment above). Now included,
    // so every request except real static assets gets a chance at a
    // session refresh; STEP 2 still returns immediately for /api/* without
    // running any of the page-auth-gating logic below it.
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\..*).*)',
  ],
};

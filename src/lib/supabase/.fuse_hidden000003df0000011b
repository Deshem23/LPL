import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase client for use in Server Components, Route Handlers, and Server
 * Actions. Reads/writes auth cookies via next/headers.
 */
export function createClient() {
  const cookieStore = cookies();
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined in environment variables');
  }
  
  if (!key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined in environment variables');
  }

  // Validate URL format
  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith('http')) {
      throw new Error('URL must be HTTP or HTTPS');
    }
  } catch (error) {
    throw new Error(`Invalid NEXT_PUBLIC_SUPABASE_URL: ${url} - ${error instanceof Error ? error.message : 'Invalid URL format'}`);
  }

  return createServerClient(
    url,
    key,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component render — safe to ignore as
            // long as a middleware session-refresh is in place.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Called from a Server Component render — safe to ignore as
            // long as a middleware session-refresh is in place.
          }
        },
      },
    }
  );
}

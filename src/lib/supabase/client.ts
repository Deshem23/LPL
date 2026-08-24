import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for use in Client Components ("use client").
 * This creates a browser client that handles auth tokens automatically.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
  }
  
  if (!key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined');
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid NEXT_PUBLIC_SUPABASE_URL: ${url}`);
  }

  return createBrowserClient(url, key);
}

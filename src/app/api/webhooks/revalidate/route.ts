// On-demand cache-busting webhook. Pairs with the `revalidate = 30` ISR
// caching added to the homepage, article pages, and the root [locale]
// layout (see the comment in [locale]/layout.tsx for why 30s was chosen):
// those pages are cached for up to 30 seconds so repeat visits load
// instantly, but that means a fresh edit can take up to ~30s to show up
// publicly. This endpoint lets anything holding the shared secret (an
// admin save action, a Supabase Database Webhook, a manual curl call)
// force an immediate refresh instead of waiting out the window.
//
// Usage: POST with header `Authorization: Bearer <REVALIDATE_SECRET>`
// and a JSON body of either:
//   { "paths": ["/fr", "/en/articles/some-slug"] }
//   { "tags": ["articles"] }   // only takes effect for fetches that opt
//                              // into that tag via `next: { tags: [...] }`
// or a single "path" / "tag" string instead of an array.
//
// REVALIDATE_SECRET must be set in the environment (.env.local for dev,
// the hosting platform's env var settings for production) - if it's
// missing, this route refuses every request rather than running open.
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: 'REVALIDATE_SECRET is not configured on the server.' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('authorization') || '';
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (provided !== secret) {
    return NextResponse.json({ success: false, error: 'Invalid or missing secret.' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // No/invalid JSON body - treated as "nothing to revalidate" below.
  }

  const paths: string[] = ([] as string[]).concat(body.paths || [], body.path ? [body.path] : []);
  const tags: string[] = ([] as string[]).concat(body.tags || [], body.tag ? [body.tag] : []);

  if (paths.length === 0 && tags.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Provide at least one "path"/"paths" or "tag"/"tags" to revalidate.' },
      { status: 400 }
    );
  }

  for (const path of paths) revalidatePath(path);
  for (const tag of tags) revalidateTag(tag);

  return NextResponse.json({ success: true, revalidated: { paths, tags } });
}

export async function GET() {
  return NextResponse.json({ success: false, error: 'Use POST.' }, { status: 405 });
}

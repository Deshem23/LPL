// Receiver for a Supabase Database Webhook (Database > Webhooks in the
// Supabase dashboard): add one HTTP webhook per table that should
// invalidate the public site's cache the moment it changes - articles,
// categories, ads, and site_settings are the ones that actually render
// on cached public pages - firing on Insert/Update/Delete. Supabase
// POSTs a payload shaped like:
//   { type: 'INSERT'|'UPDATE'|'DELETE', table: string, schema: string,
//     record: Record<string, any> | null, old_record: Record<string, any> | null }
//
// This exists specifically to complement the `revalidate = 30` ISR
// caching on the homepage/article/[locale]-layout routes (see the
// comment in [locale]/layout.tsx): without this, an admin edit can take
// up to ~30s to appear publicly; with the Supabase webhook configured,
// it's near-instant instead, because Supabase calls this the moment the
// row actually changes rather than the site waiting out the cache window.
//
// In the Supabase dashboard, set the webhook's HTTP Headers to send
// `Authorization: Bearer <SUPABASE_WEBHOOK_SECRET>` so this route can
// verify the request actually came from Supabase and not from anyone who
// happens to find the URL.
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { locales } from '@/i18n/config';

interface SupabaseWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, any> | null;
  old_record: Record<string, any> | null;
}

export async function POST(request: NextRequest) {
  const secret = process.env.SUPABASE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: 'SUPABASE_WEBHOOK_SECRET is not configured on the server.' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('authorization') || '';
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (provided !== secret) {
    return NextResponse.json({ success: false, error: 'Invalid or missing secret.' }, { status: 401 });
  }

  let payload: SupabaseWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const row = payload.record || payload.old_record;
  const revalidated: string[] = [];

  switch (payload.table) {
    case 'articles': {
      // The homepage lists articles, so always bust it; then the
      // specific article page(s) too when we have a slug to target.
      for (const locale of locales) {
        revalidatePath(`/${locale}`);
        revalidated.push(`/${locale}`);
        if (row?.slug) {
          revalidatePath(`/${locale}/articles/${row.slug}`);
          revalidated.push(`/${locale}/articles/${row.slug}`);
        }
      }
      break;
    }
    case 'categories':
    case 'site_settings':
    case 'ads': {
      // These all render inside [locale]/layout.tsx (nav, ticker ads,
      // site settings) or the homepage - safest to bust the whole
      // per-locale layout rather than guess which specific page changed.
      for (const locale of locales) {
        revalidatePath(`/${locale}`, 'layout');
        revalidated.push(`/${locale} (layout)`);
      }
      break;
    }
    default: {
      return NextResponse.json(
        { success: true, note: `No revalidation rule for table "${payload.table}" - ignored.` },
        { status: 200 }
      );
    }
  }

  return NextResponse.json({ success: true, table: payload.table, type: payload.type, revalidated });
}

export async function GET() {
  return NextResponse.json({ success: false, error: 'Use POST.' }, { status: 405 });
}

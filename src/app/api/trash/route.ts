import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { getAllTrashedItems, purgeExpiredTrash } from '@/lib/services/recycle-bin-service';

// Always fetch fresh from the DB - same reasoning as the other admin
// list routes (see /api/media/route.ts).
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requirePermission('canManageTrash');
    if (auth instanceof NextResponse) return auth;

    // Lazy, throttled 30-day auto-purge (see recycle-bin-service.ts) -
    // runs here, on the one page that actually needs the trash to be
    // accurate, rather than on every public page view the way
    // publishDueScheduledArticles() runs for scheduled articles.
    await purgeExpiredTrash();

    const items = await getAllTrashedItems();
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching trash:', error);
    return NextResponse.json({ error: 'Failed to fetch trash' }, { status: 500 });
  }
}

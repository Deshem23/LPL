import { NextResponse } from 'next/server';
import { getAds, createAd } from '@/lib/services/ad-service';
import { getCurrentUser } from '@/lib/auth/actions';
import { logAction } from '@/lib/services/audit-service';

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';


// Admin CRUD for ads. Requires auth, same pattern as /api/articles - a
// 'use client' admin page must go through this route rather than calling
// ad-service.ts directly, since that depends on SUPABASE_SERVICE_ROLE_KEY.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const type = searchParams.get('type') || undefined;
    const placement = searchParams.get('placement') || undefined;

    const ads = await getAds({ status, type, placement });
    return NextResponse.json({ ads });
  } catch (error) {
    console.error('Error fetching ads:', error);
    return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = await createAd(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logAction({
      userId: user.id,
      action: 'ad.create',
      entityType: 'ad',
      entityId: result.ad?.id,
      details: { title: result.ad?.title },
    });

    return NextResponse.json({ success: true, ad: result.ad });
  } catch (error) {
    console.error('Error creating ad:', error);
    return NextResponse.json({ error: 'Failed to create ad' }, { status: 500 });
  }
}

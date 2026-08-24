import { NextResponse } from 'next/server';
import { trackAdView, trackAdClick } from '@/lib/services/ad-service';

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';


// Public, unauthenticated on purpose: any visitor's browser needs to be
// able to record a view/click on an ad it was served. No auth check here
// mirrors how ad networks generally work - the only "sensitive" action
// (creating/editing/deleting ads) stays behind getCurrentUser() in
// /api/ads.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = body?.type === 'click' ? 'click' : 'view';

    if (type === 'click') {
      await trackAdClick(params.id);
    } else {
      await trackAdView(params.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking ad interaction:', error);
    // Never fail the page over a tracking hiccup.
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

import { NextResponse } from 'next/server';
import { getAdsByPlacement } from '@/lib/services/ad-service';

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';


// Public endpoint for 'use client' ad slots (AdComponent) - never call
// ad-service.ts directly from the browser, same reasoning as
// /api/public/articles.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const placement = searchParams.get('placement');

    if (!placement) {
      return NextResponse.json({ error: 'placement is required' }, { status: 400 });
    }

    const ads = await getAdsByPlacement(placement);
    return NextResponse.json({ ads });
  } catch (error) {
    console.error('Error fetching public ads:', error);
    return NextResponse.json({ ads: [] });
  }
}

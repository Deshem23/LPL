import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/actions';
import { getEditorDashboardData } from '@/lib/services/dashboard-service';

// Site-wide oversight numbers for the Editor dashboard. Reachability is
// already gated to admin/editor roles by middleware for the /admin/editor
// page itself - this route only requires being logged in, same auth-only
// pattern as every other admin API route in this app (/api/ads,
// /api/articles, etc).
// No request params are read below, which makes this Route Handler
// eligible for Next's static caching by default - see the matching note
// in api/admin/stats/route.ts for why that's a real bug here, not a
// theoretical one.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getEditorDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching editor dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch editor dashboard data' }, { status: 500 });
  }
}

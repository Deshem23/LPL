import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/actions';
import { getAuthorDashboardData } from '@/lib/services/dashboard-service';

// Powers the Writer and Contributor dashboards - each author's own
// article stats, scoped to whoever is logged in (never a client-supplied
// id, same pattern as /api/users/profile).
// See the matching note in api/admin/stats/route.ts - no request params
// are read below, so this route is eligible for Next's static caching
// by default without this.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getAuthorDashboardData(user.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}

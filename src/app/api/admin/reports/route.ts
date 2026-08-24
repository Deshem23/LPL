import { NextResponse } from 'next/server';
import { getReportsData } from '@/lib/services/reports-service';
import { getCurrentUser } from '@/lib/auth/actions';
import { createAdminClient } from '@/lib/supabase/admin';

// Admin-only. Backs /admin/reports - see reports-service.ts for the
// actual queries this wraps.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    const role = profile?.role || user.user_metadata?.role;

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await getReportsData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

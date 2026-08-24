import { NextResponse } from 'next/server';
import { getAd, updateAd, deleteAd } from '@/lib/services/ad-service';
import { getCurrentUser } from '@/lib/auth/actions';
import { logAction } from '@/lib/services/audit-service';

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';


export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ad = await getAd(params.id);
    if (!ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }
    return NextResponse.json({ ad });
  } catch (error) {
    console.error('Error fetching ad:', error);
    return NextResponse.json({ error: 'Failed to fetch ad' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = await updateAd(params.id, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logAction({
      userId: user.id,
      action: 'ad.update',
      entityType: 'ad',
      entityId: params.id,
      details: { title: result.ad?.title },
    });

    return NextResponse.json({ success: true, ad: result.ad });
  } catch (error) {
    console.error('Error updating ad:', error);
    return NextResponse.json({ error: 'Failed to update ad' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await getAd(params.id);

    const result = await deleteAd(params.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logAction({
      userId: user.id,
      action: 'ad.delete',
      entityType: 'ad',
      entityId: params.id,
      details: existing ? { title: existing.title } : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ad:', error);
    return NextResponse.json({ error: 'Failed to delete ad' }, { status: 500 });
  }
}

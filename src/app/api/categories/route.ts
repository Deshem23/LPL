import { NextResponse } from 'next/server';
import { getCategoriesWithSubcategories, createCategory } from '@/lib/services/category-service';
import { logAction } from '@/lib/services/audit-service';
import { requirePermission } from '@/lib/auth/require-permission';

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // The public nav/category pages only ever want active categories;
    // the admin categories page passes ?all=true so inactive ones stay
    // manageable instead of disappearing from the list entirely.
    const includeInactive = searchParams.get('all') === 'true';
    const categories = await getCategoriesWithSubcategories(includeInactive);
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission('canManageCategories');
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    const body = await request.json();
    const result = await createCategory(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logAction({
      userId: user.id,
      action: 'category.create',
      entityType: 'category',
      entityId: result.category?.id,
      details: { name: result.category?.name },
    });

    return NextResponse.json({ success: true, category: result.category });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

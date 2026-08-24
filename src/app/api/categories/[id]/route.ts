import { NextResponse } from 'next/server';
import { getCategoryById, updateCategory, deleteCategory } from '@/lib/services/category-service';
import { logAction } from '@/lib/services/audit-service';
import { requirePermission } from '@/lib/auth/require-permission';

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';


// Was an empty file - the admin categories page previously had no real
// backend at all (create/edit/delete only mutated in-memory mock state
// and never persisted anything). See category-service.ts for the actual
// DB logic.

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const category = await getCategoryById(params.id);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ category });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission('canManageCategories');
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    const body = await request.json();
    const result = await updateCategory(params.id, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logAction({
      userId: user.id,
      action: 'category.update',
      entityType: 'category',
      entityId: params.id,
      details: { name: result.category?.name },
    });

    return NextResponse.json({ success: true, category: result.category });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission('canManageCategories');
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    const existing = await getCategoryById(params.id);

    const result = await deleteCategory(params.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logAction({
      userId: user.id,
      action: 'category.delete',
      entityType: 'category',
      entityId: params.id,
      details: existing ? { name: existing.name } : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}

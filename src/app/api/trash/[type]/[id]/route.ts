import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { logAction } from '@/lib/services/audit-service';
import {
  restoreTrashItem,
  permanentlyDeleteTrashItem,
  type TrashItemType,
} from '@/lib/services/recycle-bin-service';

export const dynamic = 'force-dynamic';

const VALID_TYPES: TrashItemType[] = ['media', 'article', 'user'];

function isValidType(type: string): type is TrashItemType {
  return (VALID_TYPES as string[]).includes(type);
}

/** Restore a trashed item - clears its deleted_at, nothing else changes. */
export async function POST(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const auth = await requirePermission('canManageTrash');
    if (auth instanceof NextResponse) return auth;

    if (!isValidType(params.type)) {
      return NextResponse.json({ error: "Type d'élément invalide" }, { status: 400 });
    }

    const result = await restoreTrashItem(params.type, params.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    logAction({
      userId: auth.user.id,
      action: 'trash.restore',
      entityType: params.type,
      entityId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error restoring trash item:', error);
    return NextResponse.json({ error: 'Failed to restore item' }, { status: 500 });
  }
}

/** The real, irreversible delete - only reachable from the trash view. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const auth = await requirePermission('canManageTrash');
    if (auth instanceof NextResponse) return auth;

    if (!isValidType(params.type)) {
      return NextResponse.json({ error: "Type d'élément invalide" }, { status: 400 });
    }

    // An admin permanently deleting their own (already-trashed) user
    // account here would be deleting the very account authorizing this
    // request - block it here, at the point where it actually becomes
    // irreversible.
    if (params.type === 'user' && params.id === auth.user.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer définitivement votre propre compte.' },
        { status: 400 }
      );
    }

    const result = await permanentlyDeleteTrashItem(params.type, params.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    logAction({
      userId: auth.user.id,
      action: 'trash.permanent_delete',
      entityType: params.type,
      entityId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error permanently deleting trash item:', error);
    return NextResponse.json({ error: 'Failed to permanently delete item' }, { status: 500 });
  }
}

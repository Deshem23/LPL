import { NextResponse } from 'next/server';
import { getArticleById, updateArticle, deleteArticle } from '@/lib/services/article-service';
import { getCurrentUserWithRole } from '@/lib/auth/actions';
import { requirePermission } from '@/lib/auth/require-permission';
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
    const article = await getArticleById(params.id);
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    return NextResponse.json({ article });
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getCurrentUserWithRole();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, role } = auth;

    const body = await request.json();

    // Same server-side enforcement as POST /api/articles - the form UI
    // hides the author/editorial-flag controls for writers/contributors,
    // but that alone doesn't stop a direct PUT call from smuggling them
    // in. Deleting the keys (rather than forcing them false) leaves
    // whatever an admin/editor already set untouched - updateArticle only
    // writes columns actually present in the body.
    //
    // role is DB-authoritative here (see the matching comment in
    // POST /api/articles) rather than the JWT's user_metadata.role.
    if (role === 'writer' || role === 'contributor') {
      delete body.author_id;
      delete body.is_breaking;
      delete body.is_pinned;
      delete body.is_trending;
      delete body.is_suggestion;
    }

    // Same enforcement as POST /api/articles: writers can publish their
    // own articles directly (canPublish in permissions.ts) but not
    // archive them; contributors can only ever land on draft/review.
    // Deleting body.status (rather than forcing a value) means
    // updateArticle simply won't touch the column, leaving whatever
    // status the article already had - e.g. a contributor can't use this
    // to un-publish an article an editor already approved, and can't use
    // it to publish one either.
    if (role === 'writer' && body.status !== undefined && !['draft', 'review', 'scheduled', 'published'].includes(body.status)) {
      delete body.status;
    } else if (role === 'contributor' && body.status !== undefined && !['draft', 'review'].includes(body.status)) {
      delete body.status;
    }

    const result = await updateArticle(params.id, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logAction({
      userId: user.id,
      action: 'article.update',
      entityType: 'article',
      entityId: params.id,
      details: { title: result.article?.title, status: result.article?.status },
    });

    return NextResponse.json({ success: true, article: result.article });
  } catch (error) {
    console.error('Error updating article:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Was only checking "is someone logged in", not "is this someone
    // allowed to delete articles" - any authenticated writer/contributor
    // could delete ANY article (not just their own) via a direct DELETE
    // call, even though the admin UI never shows them a delete button.
    // canDeleteArticle is admin/editor only (see permissions.ts).
    const auth = await requirePermission('canDeleteArticle');
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    // Fetch the title before deleting - once the row is gone there's
    // nothing left to describe the audit entry with.
    const existing = await getArticleById(params.id);

    const result = await deleteArticle(params.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logAction({
      userId: user.id,
      action: 'article.delete',
      entityType: 'article',
      entityId: params.id,
      details: existing ? { title: existing.title } : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting article:', error);
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}

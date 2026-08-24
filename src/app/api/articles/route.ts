import { NextResponse } from 'next/server';
import { createArticle, getArticles, updateArticle, deleteArticle } from '@/lib/services/article-service';
import { getCurrentUserWithRole } from '@/lib/auth/actions';
import { logAction } from '@/lib/services/audit-service';

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const author_id = searchParams.get('author_id') || undefined;
    const breaking = searchParams.get('breaking') === 'true';

    const result = await getArticles({
      page,
      limit,
      category,
      search,
      status,
      author_id,
      breaking,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getCurrentUserWithRole();
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { user, role } = auth;

    const body = await request.json();

    // Writers/contributors could submit author_id/is_breaking/is_pinned/
    // is_trending/is_suggestion directly through this endpoint even
    // though the form UI hides those controls for them - a client-side-
    // only restriction is trivial to bypass with a direct API call. Force
    // authorship to the actual caller and drop the editorial flags
    // entirely for those two roles, same restriction as article-form.tsx.
    //
    // role here is DB-authoritative (public.users, via
    // getCurrentUserWithRole()) rather than the session JWT's
    // user_metadata.role - using the JWT claim meant a just-demoted
    // editor/admin whose token hadn't refreshed yet could still pass this
    // check and set editorial flags/arbitrary authorship after losing the
    // role that should allow it.
    if (role === 'writer' || role === 'contributor') {
      body.author_id = user.id;
      delete body.is_breaking;
      delete body.is_pinned;
      delete body.is_trending;
      delete body.is_suggestion;
    } else if (!body.author_id) {
      body.author_id = user.id;
    }

    if (body.status === 'published') {
      body.published_at = new Date().toISOString();
    }

    const result = await createArticle(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    logAction({
      userId: user.id,
      action: 'article.create',
      entityType: 'article',
      entityId: result.article?.id,
      details: { title: result.article?.title, status: result.article?.status },
    });

    return NextResponse.json({
      success: true,
      article: result.article
    });
  } catch (error) {
    console.error('Error creating article:', error);
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    );
  }
}

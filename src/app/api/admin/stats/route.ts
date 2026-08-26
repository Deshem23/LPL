import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { publishDueScheduledArticles } from '@/lib/services/article-service';
import { requirePermission } from '@/lib/auth/require-permission';

// This GET took no request params at all, which made Next.js statically
// cache its response (any Route Handler with no dynamic API usage is
// eligible for that) - the exact same class of bug already fixed on the
// [locale] pages via force-dynamic. That's why the admin dashboard's stat
// cards kept showing old numbers (e.g. "Categories 10" long after the
// taxonomy migration added ~40 more rows): the very first response ever
// computed got served to every request after it.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Extra defense on top of `dynamic`/`revalidate`/`fetchCache` above: an
// explicit no-store response header rules out any browser or
// intermediary cache serving a stale copy of this response, independent
// of Next's own server-side caching (already covered by the exports
// above).
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export async function GET() {
  try {
    const auth = await requirePermission('canViewAnalytics');
    if (auth instanceof NextResponse) return auth;

    // Flip any overdue 'scheduled' article to 'published' before counting -
    // otherwise the Scheduled/Published split here can lag behind what a
    // page load elsewhere already published (see the note on this same
    // helper in article-service.ts).
    await publishDueScheduledArticles();

    const supabase = createAdminClient();

    // Every count below that touches articles/users/media now excludes
    // deleted_at (trashed) rows - none of them did before, which is why
    // "Publiés" could read e.g. 15 when only 2 articles were actually
    // still published: deleteArticle() (see article-service.ts) is a
    // soft delete that only stamps deleted_at, it never touches
    // `status`, so a trashed article that was published when it got
    // deleted still has status='published' and was still being counted
    // here right alongside the ones that are actually live. Same root
    // cause would eventually have hit totalUsers/totalMedia too once
    // anything got trashed there. getRecycleBinCounts()/getTrashedX()
    // (recycle-bin-service.ts) are the only place trashed rows should
    // still be counted.

    // Get all articles count (no status filter)
    const { count: totalArticles } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Get counts by status
    const { count: published } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .is('deleted_at', null);

    const { count: draft } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft')
      .is('deleted_at', null);

    const { count: review } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'review')
      .is('deleted_at', null);

    const { count: scheduled } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .is('deleted_at', null);

    const { count: archived } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'archived')
      .is('deleted_at', null);

    // Get total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Top-level categories only (parent_id IS NULL) - counting every row
    // would also count every subcategory, which reads as a confusing,
    // much larger number ("Categories 49" instead of the 9 main sections
    // shown in the nav) and drifts every time a subcategory is added.
    // Categories have no soft-delete (deleteCategory() is a hard
    // delete - see category-service.ts), so no deleted_at filter here.
    const { count: totalCategories } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .is('parent_id', null);

    // Get total media
    const { count: totalMedia } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Get total views - trashed articles' historical views are still
    // real views that happened, but counting them here would make this
    // number drift upward from what a reader could ever have actually
    // seen live, the same inconsistency as the status counts above.
    const { data: viewsData } = await supabase
      .from('articles')
      .select('view_count')
      .is('deleted_at', null);

    const totalViews = viewsData?.reduce((sum, item) => sum + (item.view_count || 0), 0) || 0;

    return NextResponse.json({
      totalArticles: totalArticles || 0,
      published: published || 0,
      draft: draft || 0,
      review: review || 0,
      scheduled: scheduled || 0,
      archived: archived || 0,
      totalUsers: totalUsers || 0,
      totalViews: totalViews,
      totalCategories: totalCategories || 0,
      totalMedia: totalMedia || 0,
    }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({
      totalArticles: 0,
      published: 0,
      draft: 0,
      review: 0,
      scheduled: 0,
      archived: 0,
      totalUsers: 0,
      totalViews: 0,
      totalCategories: 0,
      totalMedia: 0,
    }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

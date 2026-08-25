import { createAdminClient } from '@/lib/supabase/admin';

// This service intentionally only ever reports numbers the schema can
// actually back up. There is no page_views/analytics_events table and no
// comments table in this project (see migrations/01_create_tables.sql) -
// so anything like "unique visitors", "engagement rate", or "comments"
// would have to be invented. Instead we compute everything from real
// columns: articles.view_count, articles.status, articles.published_at /
// created_at, and categories.

export interface AnalyticsOverview {
  totalViews: number;
  publishedArticles: number;
  totalArticles: number;
  totalAuthors: number;
  avgViewsPerArticle: number;
  /** Non-published article statuses, broken out - previously only
   *  "published / total" was visible here, so an admin had no way to
   *  see how much content was archived, still in review, etc. without
   *  leaving this page. */
  draftArticles: number;
  reviewArticles: number;
  scheduledArticles: number;
  archivedArticles: number;
  totalCategories: number;
  totalMedia: number;
  /** Items currently sitting in the recycle bin (soft-deleted, pending
   *  the 30-day auto-purge - see recycle-bin-service.ts), broken down by
   *  type so "deleted articles" specifically is visible, not just a
   *  combined count. */
  trash: {
    articles: number;
    media: number;
    users: number;
    total: number;
  };
}

export interface TimeSeriesPoint {
  label: string;
  articles: number;
  views: number;
}

export interface CategoryBreakdown {
  id: string;
  name: string;
  articleCount: number;
  views: number;
  color: string;
}

export interface TopArticle {
  id: string;
  title: string;
  slug: string;
  views: number;
  categoryName?: string | null;
  publishedAt?: string | null;
}

export interface AnalyticsData {
  overview: AnalyticsOverview;
  timeSeries: TimeSeriesPoint[];
  categoryBreakdown: CategoryBreakdown[];
  topArticles: TopArticle[];
}

const PALETTE = ['#3b82f6', '#8b5cf6', '#ef4444', '#22c55e', '#06b6d4', '#f59e0b', '#ec4899', '#14b8a6'];

const WEEKDAY_LABELS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTH_LABELS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const supabase = createAdminClient();

  const [
    { count: totalArticles },
    { count: publishedArticles },
    { count: draftArticles },
    { count: reviewArticles },
    { count: scheduledArticles },
    { count: archivedArticles },
    { count: totalAuthors },
    { count: totalCategories },
    { count: totalMedia },
    { data: viewsRows },
    { count: trashedArticles },
    { count: trashedMedia },
    { count: trashedUsers },
  ] = await Promise.all([
    // Every status count below (including this "total") excludes trashed
    // (soft-deleted) articles by default via Postgres' implicit filter
    // handling of NULL - deleted_at is only non-null once trashed, and
    // none of these queries filter on deleted_at at all, so a trashed
    // article's status (whatever it was when deleted) is simply not
    // counted here anymore - it now only shows up in the `trash` block
    // below, avoiding double-counting a title as both e.g. "Archivé" and
    // "in the recycle bin" at once. See article-service.ts's own
    // `.is('deleted_at', null)` for the same exclusion on the public/
    // admin article lists.
    supabase.from('articles').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('articles').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'published'),
    supabase.from('articles').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'draft'),
    supabase.from('articles').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'review'),
    supabase.from('articles').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'scheduled'),
    supabase.from('articles').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'archived'),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    // Top-level only, same reasoning as api/admin/stats/route.ts - every
    // subcategory would otherwise inflate this into a much larger, more
    // confusing number than the site's actual section count.
    supabase.from('categories').select('*', { count: 'exact', head: true }).is('parent_id', null),
    supabase.from('media').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('articles').select('view_count').is('deleted_at', null),
    supabase.from('articles').select('*', { count: 'exact', head: true }).not('deleted_at', 'is', null),
    supabase.from('media').select('*', { count: 'exact', head: true }).not('deleted_at', 'is', null),
    supabase.from('users').select('*', { count: 'exact', head: true }).not('deleted_at', 'is', null),
  ]);

  const totalViews = (viewsRows || []).reduce((sum: number, row: any) => sum + (row.view_count || 0), 0);
  const publishedCount = publishedArticles || 0;
  const trashArticles = trashedArticles || 0;
  const trashMedia = trashedMedia || 0;
  const trashUsers = trashedUsers || 0;

  return {
    totalViews,
    publishedArticles: publishedCount,
    totalArticles: totalArticles || 0,
    totalAuthors: totalAuthors || 0,
    avgViewsPerArticle: publishedCount > 0 ? Math.round((totalViews / publishedCount) * 10) / 10 : 0,
    draftArticles: draftArticles || 0,
    reviewArticles: reviewArticles || 0,
    scheduledArticles: scheduledArticles || 0,
    archivedArticles: archivedArticles || 0,
    totalCategories: totalCategories || 0,
    totalMedia: totalMedia || 0,
    trash: {
      articles: trashArticles,
      media: trashMedia,
      users: trashUsers,
      total: trashArticles + trashMedia + trashUsers,
    },
  };
}

/**
 * Buckets articles by when they were published (falling back to
 * created_at for anything never formally published, e.g. drafts) into
 * either the last 7 days or the last 6 months. Both the article count
 * and the summed view_count of the articles landing in each bucket are
 * real, derived values - there's no synthetic "daily traffic" here since
 * individual page views aren't timestamped in this schema.
 */
export async function getArticlesTimeSeries(granularity: 'weekly' | 'monthly'): Promise<TimeSeriesPoint[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.from('articles').select('published_at, created_at, view_count');

  if (error || !data) {
    console.error('Error fetching articles for time series:', error);
    return [];
  }

  const now = new Date();

  if (granularity === 'weekly') {
    const buckets: TimeSeriesPoint[] = [];
    const dayKeys: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayKeys.push(key);
      buckets.push({ label: WEEKDAY_LABELS_FR[d.getDay()], articles: 0, views: 0 });
    }
    for (const row of data) {
      const dateStr: string | null = row.published_at || row.created_at;
      if (!dateStr) continue;
      const key = dateStr.slice(0, 10);
      const idx = dayKeys.indexOf(key);
      if (idx !== -1) {
        buckets[idx].articles += 1;
        buckets[idx].views += row.view_count || 0;
      }
    }
    return buckets;
  }

  // monthly: last 6 calendar months
  const buckets: TimeSeriesPoint[] = [];
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthKeys.push(key);
    buckets.push({ label: MONTH_LABELS_FR[d.getMonth()], articles: 0, views: 0 });
  }
  for (const row of data) {
    const dateStr: string | null = row.published_at || row.created_at;
    if (!dateStr) continue;
    const key = dateStr.slice(0, 7);
    const idx = monthKeys.indexOf(key);
    if (idx !== -1) {
      buckets[idx].articles += 1;
      buckets[idx].views += row.view_count || 0;
    }
  }
  return buckets;
}

/**
 * Groups articles by their TOP-LEVEL category. An article's category_id
 * can point directly at a subcategory row, so subcategory articles are
 * rolled up into their parent for this chart - see the note in
 * article-service.ts / category-service.ts.
 */
export async function getCategoryBreakdown(): Promise<CategoryBreakdown[]> {
  const supabase = createAdminClient();

  const [{ data: categories, error: catError }, { data: articles, error: artError }] = await Promise.all([
    supabase.from('categories').select('id, name, parent_id'),
    supabase.from('articles').select('category_id, view_count'),
  ]);

  if (catError || artError || !categories) {
    console.error('Error fetching category breakdown:', catError || artError);
    return [];
  }

  const byId = new Map(categories.map((c: any) => [c.id, c]));
  const topLevel = categories.filter((c: any) => !c.parent_id);

  const stats = new Map<string, { articleCount: number; views: number }>();
  for (const cat of topLevel) {
    stats.set(cat.id, { articleCount: 0, views: 0 });
  }

  for (const article of articles || []) {
    if (!article.category_id) continue;
    const cat = byId.get(article.category_id);
    if (!cat) continue;
    const topId = cat.parent_id && byId.has(cat.parent_id) ? cat.parent_id : cat.id;
    if (!stats.has(topId)) {
      stats.set(topId, { articleCount: 0, views: 0 });
    }
    const entry = stats.get(topId)!;
    entry.articleCount += 1;
    entry.views += article.view_count || 0;
  }

  const result: CategoryBreakdown[] = [];
  let colorIdx = 0;
  for (const cat of topLevel) {
    const entry = stats.get(cat.id) || { articleCount: 0, views: 0 };
    result.push({
      id: cat.id,
      name: cat.name,
      articleCount: entry.articleCount,
      views: entry.views,
      color: PALETTE[colorIdx % PALETTE.length],
    });
    colorIdx++;
  }

  return result
    .filter((c) => c.articleCount > 0)
    .sort((a, b) => b.articleCount - a.articleCount);
}

export async function getTopArticles(limit: number = 5): Promise<TopArticle[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('articles')
    .select('id, title, slug, view_count, published_at, category:category_id ( name )')
    .order('view_count', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Error fetching top articles:', error);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    views: row.view_count || 0,
    categoryName: row.category?.name || null,
    publishedAt: row.published_at || null,
  }));
}

export async function getAnalyticsData(granularity: 'weekly' | 'monthly'): Promise<AnalyticsData> {
  const [overview, timeSeries, categoryBreakdown, topArticles] = await Promise.all([
    getAnalyticsOverview(),
    getArticlesTimeSeries(granularity),
    getCategoryBreakdown(),
    getTopArticles(5),
  ]);

  return { overview, timeSeries, categoryBreakdown, topArticles };
}

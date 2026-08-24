import { createAdminClient } from '@/lib/supabase/admin';

// Backs the Writer/Contributor ("my own articles") and Editor
// ("site-wide oversight") admin dashboards, all of which were 100% mock
// data before this - hardcoded stat numbers, a hardcoded pending-review
// queue, and a hardcoded "recent activity" feed, none of it wired to any
// API. There's no `audit_logs` writer anywhere in this codebase yet (the
// table exists but nothing inserts into it), so "recent activity" here
// is derived from the articles table itself (ordered by updated_at)
// rather than a real activity log - it's real data, just reconstructed
// rather than logged as discrete events.
//
// Note: the `media` table has no uploader column at all (see
// migrations/01_create_tables.sql) - there is no way to scope "media I
// uploaded" to one author with the current schema. Writer/Contributor
// dashboards intentionally don't show a per-author media list because of
// this; the Editor dashboard's media count is site-wide, which is
// accurate for an oversight view.

export interface AuthorArticleSummary {
  id: string;
  title: string;
  slug: string;
  status: string;
  views: number;
  date: string;
}

export interface AuthorDashboardData {
  stats: {
    total: number;
    draft: number;
    review: number;
    scheduled: number;
    published: number;
    archived: number;
    totalViews: number;
    publishedThisMonth: number;
  };
  recentArticles: AuthorArticleSummary[];
}

export async function getAuthorDashboardData(authorId: string): Promise<AuthorDashboardData> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('articles')
    .select('id, title, slug, status, view_count, created_at, published_at')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching author dashboard data:', error);
  }

  const rows = data || [];
  const now = new Date();
  const stats = {
    total: rows.length,
    draft: 0,
    review: 0,
    scheduled: 0,
    published: 0,
    archived: 0,
    totalViews: 0,
    publishedThisMonth: 0,
  };

  for (const row of rows) {
    if (row.status && row.status in stats) {
      (stats as any)[row.status] += 1;
    }
    stats.totalViews += row.view_count || 0;
    if (
      row.status === 'published' &&
      row.published_at &&
      new Date(row.published_at).getMonth() === now.getMonth() &&
      new Date(row.published_at).getFullYear() === now.getFullYear()
    ) {
      stats.publishedThisMonth += 1;
    }
  }

  const recentArticles: AuthorArticleSummary[] = rows.slice(0, 5).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    views: row.view_count || 0,
    date: row.published_at || row.created_at,
  }));

  return { stats, recentArticles };
}

export interface PendingArticle {
  id: string;
  title: string;
  author: string;
  submitted: string;
  status: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  article: string;
  time: string;
  user: string;
}

export interface EditorDashboardData {
  stats: {
    totalArticles: number;
    pendingReview: number;
    publishedToday: number;
    totalViews: number;
    approvalRate: number;
    totalMedia: number;
    totalAds: number;
  };
  pendingArticles: PendingArticle[];
  recentActivity: ActivityItem[];
}

const STATUS_ACTION_LABELS: Record<string, string> = {
  published: 'Publié',
  scheduled: 'Programmé',
  review: 'Soumis pour révision',
  draft: 'Brouillon enregistré',
  archived: 'Archivé',
};

export async function getEditorDashboardData(): Promise<EditorDashboardData> {
  const supabase = createAdminClient();

  const [{ data: articleRows }, { count: totalMedia }, { count: totalAds }] = await Promise.all([
    supabase
      .from('articles')
      .select('id, title, status, view_count, created_at, updated_at, published_at, author:author_id ( name )')
      .order('updated_at', { ascending: false }),
    supabase.from('media').select('*', { count: 'exact', head: true }),
    supabase.from('ads').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  const rows = articleRows || [];
  const todayStr = new Date().toISOString().slice(0, 10);

  let totalViews = 0;
  let published = 0;
  let pendingReview = 0;
  let publishedToday = 0;

  for (const row of rows) {
    totalViews += row.view_count || 0;
    if (row.status === 'published') {
      published += 1;
      if (row.published_at && row.published_at.slice(0, 10) === todayStr) {
        publishedToday += 1;
      }
    }
    if (row.status === 'review') pendingReview += 1;
  }

  const totalArticles = rows.length;
  const approvalRate = totalArticles > 0 ? Math.round((published / totalArticles) * 100) : 0;

  const pendingArticles: PendingArticle[] = rows
    .filter((row) => row.status === 'review')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 10)
    .map((row: any) => ({
      id: row.id,
      title: row.title,
      author: row.author?.name || 'Auteur inconnu',
      submitted: row.created_at,
      status: row.status,
    }));

  const recentActivity: ActivityItem[] = rows.slice(0, 8).map((row: any) => ({
    id: row.id,
    action: STATUS_ACTION_LABELS[row.status] || row.status,
    article: row.title,
    time: row.updated_at,
    user: row.author?.name || 'Auteur inconnu',
  }));

  return {
    stats: {
      totalArticles,
      pendingReview,
      publishedToday,
      totalViews,
      approvalRate,
      totalMedia: totalMedia || 0,
      totalAds: totalAds || 0,
    },
    pendingArticles,
    recentActivity,
  };
}

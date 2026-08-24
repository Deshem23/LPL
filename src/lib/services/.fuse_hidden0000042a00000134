import { createAdminClient } from '@/lib/supabase/admin';
import { publishDueScheduledArticles } from '@/lib/services/article-service';

// Data layer for /admin/reports. Deliberately distinct from
// analytics-service.ts (which answers "how is our traffic/content doing"
// with views/time-series/category charts): this is an operational report
// - content pipeline health (how much is stuck in each status), a
// per-author production breakdown, and what's queued to auto-publish next
// (ties into the scheduled-publish fix in article-service.ts).

export interface StatusBreakdownRow {
  status: string;
  label: string;
  count: number;
}

export interface AuthorReportRow {
  authorId: string;
  authorName: string;
  published: number;
  draft: number;
  scheduled: number;
  review: number;
  archived: number;
  totalViews: number;
}

export interface UpcomingScheduledArticle {
  id: string;
  title: string;
  slug: string;
  scheduledPublishAt: string;
  authorName: string;
}

export interface ReportsData {
  statusBreakdown: StatusBreakdownRow[];
  authorReport: AuthorReportRow[];
  upcomingScheduled: UpcomingScheduledArticle[];
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  review: 'En révision',
  scheduled: 'Programmé',
  published: 'Publié',
  archived: 'Archivé',
};

export async function getContentStatusBreakdown(): Promise<StatusBreakdownRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('articles').select('status');

  if (error || !data) {
    console.error('Error fetching content status breakdown:', error);
    return [];
  }

  const counts = new Map<string, number>();
  for (const row of data as { status: string }[]) {
    counts.set(row.status, (counts.get(row.status) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([status, count]) => ({ status, label: STATUS_LABELS[status] || status, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getAuthorPerformanceReport(): Promise<AuthorReportRow[]> {
  const supabase = createAdminClient();

  const [{ data: articles, error: artError }, { data: users, error: userError }] = await Promise.all([
    supabase.from('articles').select('author_id, status, view_count'),
    supabase.from('users').select('id, name'),
  ]);

  if (artError || userError || !articles || !users) {
    console.error('Error fetching author performance report:', artError || userError);
    return [];
  }

  const nameById = new Map((users as { id: string; name: string }[]).map((u) => [u.id, u.name]));
  const rows = new Map<string, AuthorReportRow>();

  for (const a of articles as { author_id: string | null; status: string; view_count: number | null }[]) {
    if (!a.author_id) continue;
    if (!rows.has(a.author_id)) {
      rows.set(a.author_id, {
        authorId: a.author_id,
        authorName: nameById.get(a.author_id) || 'Auteur inconnu',
        published: 0,
        draft: 0,
        scheduled: 0,
        review: 0,
        archived: 0,
        totalViews: 0,
      });
    }
    const row = rows.get(a.author_id)!;
    if (a.status === 'published') row.published += 1;
    else if (a.status === 'draft') row.draft += 1;
    else if (a.status === 'scheduled') row.scheduled += 1;
    else if (a.status === 'review') row.review += 1;
    else if (a.status === 'archived') row.archived += 1;
    row.totalViews += a.view_count || 0;
  }

  return Array.from(rows.values()).sort((a, b) => b.published - a.published);
}

export async function getUpcomingScheduledArticles(limit: number = 10): Promise<UpcomingScheduledArticle[]> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('articles')
    .select('id, title, slug, scheduled_publish_at, author:author_id ( name )')
    .eq('status', 'scheduled')
    .gte('scheduled_publish_at', nowIso)
    .order('scheduled_publish_at', { ascending: true })
    .limit(limit);

  if (error || !data) {
    console.error('Error fetching upcoming scheduled articles:', error);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    scheduledPublishAt: row.scheduled_publish_at,
    authorName: row.author?.name || 'Auteur inconnu',
  }));
}

export async function getReportsData(): Promise<ReportsData> {
  // Same reasoning as api/admin/stats/route.ts - flip any overdue
  // 'scheduled' article to 'published' before computing counts, so the
  // status breakdown and author table reflect what's actually true right
  // now instead of what was true whenever this article was last read.
  await publishDueScheduledArticles();

  const [statusBreakdown, authorReport, upcomingScheduled] = await Promise.all([
    getContentStatusBreakdown(),
    getAuthorPerformanceReport(),
    getUpcomingScheduledArticles(10),
  ]);

  return { statusBreakdown, authorReport, upcomingScheduled };
}

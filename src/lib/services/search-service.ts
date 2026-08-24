// Low-level DB search for articles. Mirrors article-service.ts's shape
// (same author/category embeds) so the public layer (lib/api/articles.ts)
// can map rows through the exact same mapDbArticle() used everywhere
// else, instead of maintaining a second, slightly-different Article
// shape just for search results.
//
// Like every other *-service.ts file, this uses the service-role client
// and must only ever run server-side.

import { createAdminClient } from '@/lib/supabase/admin';

// PostgREST's `.or()` filter syntax treats commas and parentheses as
// structural characters. A raw search query containing them would break
// (or silently mis-parse) the filter string, so strip them - real search
// queries essentially never need them to find a match.
function sanitizeForOrFilter(input: string): string {
  return input.replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function searchArticlesInDb(params: {
  query: string;
  page?: number;
  limit?: number;
  /** Defaults to 'published' - callers that need drafts/etc must opt in explicitly. */
  status?: string;
}): Promise<{ articles: any[]; total: number; totalPages: number; currentPage: number }> {
  const page = params.page || 1;
  const limit = params.limit || 10;
  const empty = { articles: [], total: 0, totalPages: 0, currentPage: page };

  const q = sanitizeForOrFilter(params.query || '');
  if (q.length < 2) return empty;

  const supabase = createAdminClient();
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('articles')
    .select(
      `
      *,
      author:author_id (
        id,
        name,
        email,
        avatar_url,
        bio
      ),
      category:category_id (
        id,
        name,
        slug,
        parent_id
      )
    `,
      { count: 'exact' }
    )
    .eq('status', params.status || 'published')
    .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%,content.ilike.%${q}%`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error searching articles:', error);
    return empty;
  }

  const total = count || 0;
  return {
    articles: data || [],
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
}

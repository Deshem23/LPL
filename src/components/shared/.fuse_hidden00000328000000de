'use client';

import Link from 'next/link';
import type { Article } from '@/lib/api/articles';

// This used to call getTrendingArticles() from
// @/lib/services/article-service directly in a useEffect - that's the
// admin, service-role-backed service, which only works server-side (see
// src/lib/supabase/admin.ts), so calling it here from the browser would
// throw. It also silently ignored the `articles` prop the parent
// (Sidebar) already passes in. Derive trending articles from that prop
// instead - no fetch needed.
interface TrendingArticlesProps {
  locale: string;
  articles?: Article[];
  limit?: number;
}

export function TrendingArticles({ locale, articles = [], limit = 5 }: TrendingArticlesProps) {
  const flaggedTrending = articles.filter((a) => a.isTrending);
  const trending = (flaggedTrending.length > 0 ? flaggedTrending : articles)
    .slice()
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, limit);

  if (trending.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun article tendance</p>;
  }

  return (
    <div className="space-y-4">
      {trending.map((article, index) => (
        <Link
          key={article.id}
          href={`/${locale}/articles/${article.slug}`}
          className="group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
        >
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="line-clamp-2 text-sm font-medium group-hover:text-primary transition-colors">
              {article.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {article.views || 0} vues
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

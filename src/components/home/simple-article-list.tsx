// Server Component: see pinned-articles.tsx for why this must not be
// 'use client'.
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { getArticles, type Article } from '@/lib/api/articles';

interface SimpleArticleListProps {
  locale: string;
  limit?: number;
  title?: string;
  showImages?: boolean;
  articles?: Article[];
}

export async function SimpleArticleList({
  locale,
  limit = 6,
  title = 'Suggestions',
  showImages = true,
  articles: articlesProp,
}: SimpleArticleListProps) {
  // Category-scoped listing goes through getArticlesByCategory() on the
  // /categories pages now - this component only takes a category filter
  // by being handed pre-filtered `articles`, not by filtering itself.
  const allArticles = articlesProp ?? (await getArticles({
    locale,
    limit,
  })).articles;
  const articles = allArticles.slice(0, limit);

  if (articles.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Aucun article disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/${locale}/articles/${article.slug}`}
            className="group flex gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            {showImages && (
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                {article.coverImage ? (
                  <Image
                    src={article.coverImage}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted">
                    <span className="text-2xl">📄</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="line-clamp-2 text-base font-semibold group-hover:text-primary">
                {article.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {article.excerpt}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(article.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {/* precomputed at write time - see the matching note
                      in pinned-articles.tsx */}
                  {article.readTime || '1 min'}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

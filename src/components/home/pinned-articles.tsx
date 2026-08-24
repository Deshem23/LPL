// Server Component: fetches (or filters already-fetched) published
// articles server-side. Do NOT add 'use client' here — this is an async
// component, which client components cannot be, and it would also force
// the admin/service-role Supabase client to run in the browser (see
// src/lib/supabase/admin.ts for why that's unsafe).
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate, getReadingTime } from '@/lib/utils';
import { getArticles, type Article } from '@/lib/api/articles';

interface PinnedArticlesProps {
  locale: string;
  articles?: Article[];
}

export async function PinnedArticles({ locale, articles: articlesProp }: PinnedArticlesProps) {
  const articles = articlesProp ?? (await getArticles({
    locale,
    limit: 20,
    status: 'published',
  })).articles;

  // Filter pinned/featured articles; fall back to most-viewed if none are
  // explicitly flagged, so this section isn't empty on a fresh site.
  // Capped at 4 (1 main + 3 side) per the requested "max 4 articles".
  let pinnedArticles = articles.filter(a => a.isPinned || a.isFeatured).slice(0, 4);
  if (pinnedArticles.length === 0) {
    pinnedArticles = [...articles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 4);
  }

  if (pinnedArticles.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Aucun article à la une</p>
      </div>
    );
  }

  const mainArticle = pinnedArticles[0];
  const sideArticles = pinnedArticles.slice(1, 4);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Main Featured Article */}
      <Link
        href={`/${locale}/articles/${mainArticle.slug}`}
        className="group relative overflow-hidden rounded-xl lg:col-span-2"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {mainArticle.coverImage ? (
            <Image
              src={mainArticle.coverImage}
              alt={mainArticle.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 66vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
              <span className="text-4xl font-bold text-muted-foreground">📰</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute bottom-0 p-6 text-white sm:p-8">
            <Badge variant="secondary" className="mb-3 bg-primary text-white">
              À la une
            </Badge>
            {/* Excerpt removed - on top of the title, it filled enough of
                the image that on mobile the two together covered nearly
                the whole card, leaving barely any actual photo visible.
                The title alone is what a "À la une" card needs to work;
                the excerpt is one click away on the article itself. */}
            <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
              {mainArticle.title}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-white/70 sm:text-sm">
              <span>{mainArticle.author.name}</span>
              <span>{formatDate(mainArticle.createdAt)}</span>
              <span>{getReadingTime(mainArticle.content)} min</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Side Articles */}
      <div className="space-y-4">
        {sideArticles.map((article) => (
          <Link
            key={article.id}
            href={`/${locale}/articles/${article.slug}`}
            className="group flex gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
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
            <div className="flex-1 space-y-1">
              <h3 className="line-clamp-2 text-sm font-semibold group-hover:text-primary">
                {article.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {formatDate(article.createdAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

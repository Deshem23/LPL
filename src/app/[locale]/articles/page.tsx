import { Suspense } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { QuickSearchCard } from '@/components/articles/quick-search-card';
import { ArchiveCalendar } from '@/components/articles/archive-calendar';
import { getArticles, type Article } from '@/lib/api/articles';

// See the matching comment in categories/[slug]/page.tsx.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Archives - Les Pages Libres',
  description: 'Recherchez et parcourez toutes les archives d’articles publiés sur Les Pages Libres.',
};

// Renamed from "Tous les articles" to "Archives" - this is the browse/
// search-through-everything-ever-published page, so "Archives" describes
// it better, and it now has a real filter set (quick search + a calendar
// to jump to a specific day) instead of just a plain text box.
//
// The outer wrapper used to be `container-custom section-padding` -
// neither class exists anywhere in this project's CSS or Tailwind config
// (confirmed: no other file in the codebase even references them), so it
// resolved to nothing and the content had no centering/max-width/padding
// of its own - just whatever the layout gave it, which is why the list
// sat flush against the left edge instead of centered like every other
// page. Swapped for the same `container` class (defined in
// tailwind.config.js: centered, responsive padding) the rest of the site
// already uses.
export default async function ArticlesPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { page?: string; search?: string; date?: string };
}) {
  const page = Number(searchParams?.page) || 1;
  const search = searchParams?.search || '';
  const date = searchParams?.date || '';
  const { articles, total, totalPages } = await getArticles({
    locale,
    page,
    search: search || undefined,
    date: date || undefined,
  });

  // Preserves the active filters across pagination links - a plain href
  // like `?page=2` would otherwise silently drop the current search/date
  // when moving to the next page.
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (date) params.set('date', date);
    params.set('page', String(p));
    return `?${params.toString()}`;
  };

  const clearSearchHref = (() => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    const qs = params.toString();
    return `/${locale}/articles${qs ? `?${qs}` : ''}`;
  })();

  const clearDateHref = (() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const qs = params.toString();
    return `/${locale}/articles${qs ? `?${qs}` : ''}`;
  })();

  const dateLabel = date ? format(parseISO(date), 'd MMMM yyyy', { locale: fr }) : '';

  const descriptor = search
    ? `pour « ${search} »`
    : date
    ? `publiés le ${dateLabel}`
    : 'archivés sur la plateforme';

  return (
    <div className="container py-10 md:py-14">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl font-bold sm:text-4xl">Archives</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {total} article{total > 1 ? 's' : ''} {descriptor}
          </p>
        </div>

        <div className="mb-5">
          <QuickSearchCard locale={locale} initialSearch={search} />
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <ArchiveCalendar locale={locale} search={search} selectedDate={date} />

          {(search || date) && (
            <div className="flex flex-wrap items-center gap-2">
              {search && (
                <a
                  href={clearSearchHref}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  « {search} »
                  <X className="h-3 w-3" />
                </a>
              )}
              {date && (
                <a
                  href={clearDateHref}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {dateLabel}
                  <X className="h-3 w-3" />
                </a>
              )}
              <a
                href={`/${locale}/articles`}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Tout effacer
              </a>
            </div>
          )}
        </div>

        <Suspense fallback={<ArticlesSkeleton />}>
          {articles.length > 0 ? (
            <div className="divide-y rounded-lg border">
              {articles.map((article) => (
                <SimpleArticleRow key={article.id} article={article} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {search || date
                ? 'Aucun article ne correspond à ces filtres.'
                : 'Aucun article pour le moment.'}
            </p>
          )}
        </Suspense>

        {totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={page > 1 ? pageHref(page - 1) : undefined}
                    aria-disabled={page <= 1}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <PaginationEach key={p} p={p} idx={idx} arr={arr} page={page} pageHref={pageHref} />
                  ))}

                <PaginationItem>
                  <PaginationNext
                    href={page < totalPages ? pageHref(page + 1) : undefined}
                    aria-disabled={page >= totalPages}
                    className={page >= totalPages ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}

function PaginationEach({
  p,
  idx,
  arr,
  page,
  pageHref,
}: {
  p: number;
  idx: number;
  arr: number[];
  page: number;
  pageHref: (p: number) => string;
}) {
  const prev = arr[idx - 1];
  const needsEllipsis = prev !== undefined && p - prev > 1;

  return (
    <>
      {needsEllipsis && (
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
      )}
      <PaginationItem>
        <PaginationLink href={pageHref(p)} isActive={p === page}>
          {p}
        </PaginationLink>
      </PaginationItem>
    </>
  );
}

// Simple single-row list item - small thumbnail, title, and a one-line
// meta row - instead of the previous big card (large image, excerpt,
// tags, view count) that made a plain search/browse list feel heavy.
function SimpleArticleRow({ article, locale }: { article: Article; locale: string }) {
  const formattedDate = new Date(article.createdAt).toLocaleDateString(locale || 'fr', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <a href={`/${locale}/articles/${article.slug}`} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
        {article.coverImage ? (
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium">{article.title}</h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {article.author.name} · {formattedDate}
          {article.category ? ` · ${article.category.name}` : ''}
        </p>
      </div>
    </a>
  );
}

function ArticlesSkeleton() {
  return (
    <div className="divide-y rounded-lg border">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-14 w-14 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

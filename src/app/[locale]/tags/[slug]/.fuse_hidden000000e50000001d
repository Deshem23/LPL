import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { ArticleCard } from '@/components/articles/article-card';
import { getArticles } from '@/lib/api/articles';

// See the matching comment in categories/[slug]/page.tsx.
export const dynamic = 'force-dynamic';

export default async function TagPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  // getArticles() has no tag filter of its own, so pull a larger pool and
  // filter by tag here - this used to ignore `slug` entirely and show
  // every article regardless of tag.
  const { articles: allArticles } = await getArticles({ locale, page: 1, limit: 100 });
  const articles = allArticles.filter((article) => article.tags?.includes(slug));

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Tag: {slug}</h1>
      <p className="mt-2 text-muted-foreground">
        Articles tagged with &ldquo;{slug}&rdquo;
      </p>

      <Suspense fallback={<ArticlesSkeleton />}>
        <div className="mt-8 space-y-6">
          {articles.length > 0 ? (
            articles.map((article) => (
              <ArticleCard key={article.id} article={article} locale={locale} />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-12">
              No articles found with this tag.
            </p>
          )}
        </div>
      </Suspense>
    </div>
  );
}

function ArticlesSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-[150px] w-full" />
      ))}
    </div>
  );
}

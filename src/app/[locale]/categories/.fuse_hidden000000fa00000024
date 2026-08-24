import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryCard } from '@/components/categories/category-card';
import { getCategories } from '@/lib/api/categories';

// See the matching comment in [slug]/page.tsx - forces this list to
// always reflect the live categories table instead of a stale cached copy.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Categories - News Platform',
  description: 'Browse news by category. Find the latest news in politics, economy, health, culture, sports, and technology.',
};

export default async function CategoriesPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const categories = await getCategories({ locale });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Categories</h1>
        <p className="mt-2 text-muted-foreground">
          Browse news by category
        </p>
      </div>

      <Suspense fallback={<CategoriesSkeleton />}>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} locale={locale} />
          ))}
        </div>
      </Suspense>
    </div>
  );
}

function CategoriesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-[150px] rounded-lg" />
      ))}
    </div>
  );
}

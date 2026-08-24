import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategoriesWithSubcategories } from '@/lib/services/category-service';
import { getArticlesByCategory, getArticles } from '@/lib/api/articles';
import { getSiteSettings } from '@/lib/services/settings-service';
import { CategoryClient } from './category-client';

// Categories/articles change via the admin CRUD at any time - without this,
// Next.js's default fetch caching (Next 14 caches fetch() by default,
// including supabase-js's calls under the hood, since it patches the
// global fetch) can keep serving a stale result - e.g. a "Category Not
// Found" 404 for a subcategory that was later created/fixed, even after
// the underlying data is correct. This forces every request to hit the
// database fresh.
export const dynamic = 'force-dynamic';

interface CategoryPageProps {
  params: { locale: string; slug: string };
  searchParams: { page?: string; search?: string; date?: string };
}

// Resolves the real, admin-managed category (and its subcategories) by
// slug - this used to look the slug up in a hardcoded 9-item config file
// (lib/config/categories.ts), so any category created in /admin/categories
// 404'd on its own public page even though articles could be assigned to
// it. Shaped to match the {slug, label, subcategories} shape category-client.tsx
// expects, so that component needs no changes.
async function resolveCategory(slug: string) {
  // includeCounts: false - this only needs slug/name/subcategories (see
  // the return shape below), never article_count, but the default `true`
  // was making every single category page view pay for an unbounded
  // `SELECT category_id FROM articles` over the ENTIRE table just to
  // tally counts nobody reads here - the exact same wasted scan already
  // fixed for the header nav (see category-service.ts's own comment).
  // This is what was behind the visible loading-skeleton-then-slow-load
  // on every category click, and it only gets worse as articles grow.
  const categories = await getCategoriesWithSubcategories(false, false);
  const dbCategory = categories.find((c) => c.slug === slug);
  if (!dbCategory) return null;

  return {
    slug: dbCategory.slug,
    label: dbCategory.name,
    subcategories: (dbCategory.subcategories || []).map((s) => ({
      slug: s.slug,
      label: s.name,
    })),
  };
}

export async function generateMetadata({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  const category = await resolveCategory(slug);

  if (!category) {
    return {
      title: 'Category Not Found',
    };
  }

  return {
    title: `${category.label} - Les Pages Libres`,
    description: `Dernières actualités et articles sur ${category.label}`,
  };
}

export default async function CategoryPage({
  params: { locale, slug },
  searchParams,
}: CategoryPageProps) {
  const page = parseInt(searchParams.page || '1');
  const search = searchParams.search || '';
  const date = searchParams.date || '';

  // resolveCategory(), site settings (for articlesPerPage), and the
  // sidebar's site-wide latest-articles fetch don't depend on each other
  // - but were previously awaited one after another, on top of the main
  // getArticlesByCategory() call below: 4 sequential DB round trips on
  // every category page load. Running the 3 independent ones together
  // with Promise.all cuts that to 2 round trips worth of latency.
  const [category, { articles_per_page: articlesPerPage }, sitewideResult] = await Promise.all([
    resolveCategory(slug),
    // Page size comes from Settings > General > "Articles par page" -
    // was saved but never actually read anywhere, so changing it in the
    // admin had no effect on this listing.
    getSiteSettings(),
    // Site-wide latest articles for the sidebar's Trending/Latest
    // widgets - same call the homepage makes - so those widgets show
    // the same thing here as they do on the homepage, instead of
    // only-this-category content.
    getArticles({ locale, limit: 20 }).catch((error) => {
      console.error('Error fetching site-wide sidebar articles:', error);
      return null;
    }),
  ]);

  if (!category) {
    notFound();
  }

  // Scoped to this category AND all of its subcategories (resolved
  // against the real categories table, not the static nav config) - so
  // nothing published under a subcategory is missing from its parent
  // category's listing.
  const { articles, total, totalPages } = await getArticlesByCategory({
    locale,
    categorySlug: slug,
    page,
    limit: articlesPerPage || 11,
    search: search || undefined,
    date: date || undefined,
  });

  const sidebarArticles = sitewideResult?.articles ?? articles;

  return (
    <CategoryClient
      locale={locale}
      category={category}
      articles={articles}
      sidebarArticles={sidebarArticles}
      total={total}
      totalPages={totalPages}
      currentPage={page}
      search={search}
      date={date}
    />
  );
}

// Public-facing category data layer for the storefront (the /categories
// index page, the navbar, the homepage category grid, the sidebar
// "Catégories" widget). This used to be 100% mock data (mockCategories,
// a hardcoded 8-item array) completely disconnected from the categories
// an admin actually creates/edits in /admin/categories - so anything the
// admin added never showed up anywhere on the public site. This now
// reads the real `categories` table via category-service.ts, same as
// the admin pages and lib/api/articles.ts already do.
//
// Server Components (e.g. src/app/[locale]/categories/page.tsx) can call
// these functions directly. 'use client' components must go through
// /api/categories instead (see the comment in src/lib/supabase/admin.ts).

import {
  getCategoriesWithSubcategories,
  getCategoryBySlug as getCategoryBySlugFromDb,
} from '@/lib/services/category-service';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  count?: number;
  color?: string;
}

interface GetCategoriesParams {
  locale: string;
}

// Top-level categories only (with their subcategories' articles rolled
// into `count`), same set the admin CRUD manages - active ones only,
// matching every other public listing on the site.
export async function getCategories({ locale }: GetCategoriesParams): Promise<Category[]> {
  const categories = await getCategoriesWithSubcategories(false);

  return categories.map((c) => {
    const subArticleCount = (c.subcategories || []).reduce(
      (sum, sub) => sum + (sub.article_count || 0),
      0
    );
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || undefined,
      count: (c.article_count || 0) + subArticleCount,
    };
  });
}

export async function getCategory({
  slug,
}: {
  locale: string;
  slug: string;
}): Promise<Category | null> {
  const category = await getCategoryBySlugFromDb(slug);
  if (!category) return null;

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description || undefined,
  };
}

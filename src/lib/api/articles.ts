// Public-facing article data layer for the storefront (homepage, category
// pages, article pages, etc). This calls the DB-backed admin service
// directly (see src/lib/services/article-service.ts / src/lib/supabase/admin.ts),
// which is safe here because everything in this file is meant to be used
// only from Server Components — never from a 'use client' component. A
// client component that needs article data must go through an API route
// instead (see the comment in src/lib/supabase/admin.ts for why: the
// service-role key this depends on is never sent to the browser).
//
// Unlike the admin service, every function here defaults to
// status: 'published' unless a caller explicitly overrides it, since the
// public site must never leak drafts, in-review, scheduled, or archived
// content.

import {
  getArticles as fetchArticlesFromDb,
  getArticleBySlug as fetchArticleBySlugFromDb,
  incrementViewCount,
} from '@/lib/services/article-service';
import {
  getCategoryWithChildIdsBySlug,
  getSubcategoryBySlug,
  getRelatedCategoryIds,
} from '@/lib/services/category-service';
import { searchArticlesInDb } from '@/lib/services/search-service';

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
    bio?: string;
    email?: string;
    roleTitle?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  // May be a top-level category OR a subcategory row - parentId tells
  // you which (non-null means this is a subcategory).
  category?: {
    id: string;
    name: string;
    slug: string;
    parentId?: string | null;
  };
  tags?: string[];
  status: 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
  views: number;
  readTime?: string;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  isBreaking?: boolean;
  isSuggestion?: boolean;
}

interface GetArticlesParams {
  locale: string;
  page?: number;
  status?: string;
  admin?: boolean;
  limit?: number;
  /** Scope to one author's own articles - e.g. the author profile page. */
  authorId?: string;
  search?: string;
  /** 'YYYY-MM-DD' - filter to articles created on this calendar day (used
   * by the /articles "Archives" page's calendar filter). */
  date?: string;
}

interface GetArticlesByCategoryParams {
  locale: string;
  /** Top-level category slug (from the categories table). */
  categorySlug: string;
  /** Optional subcategory slug, scoped to categorySlug's children. */
  subcategorySlug?: string;
  page?: number;
  limit?: number;
  search?: string;
  /** 'YYYY-MM-DD' */
  date?: string;
}

interface GetArticlesResponse {
  articles: Article[];
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

// Maps a DB row (snake_case, as returned by article-service.ts) to the
// public, camelCase Article shape the storefront components expect.
// Exported so other server-only code (e.g. the public articles API route,
// for its `breaking=true` branch) can reuse it on rows it fetched itself
// via a different article-service.ts function.
export function mapDbArticle(row: any): Article {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt || '',
    content: row.content,
    coverImage: row.featured_image || row.cover_image || undefined,
    author: {
      id: row.author?.id || row.author_id || '',
      name: row.author?.name || 'Rédaction',
      avatarUrl: row.author?.avatar_url || undefined,
      bio: row.author?.bio || undefined,
      email: row.author?.email || undefined,
      roleTitle: row.author?.role_title || undefined,
      twitter: row.author?.twitter || undefined,
      linkedin: row.author?.linkedin || undefined,
      website: row.author?.website || undefined,
    },
    category: row.category
      ? {
          id: row.category.id,
          name: row.category.name,
          slug: row.category.slug,
          parentId: row.category.parent_id ?? null,
        }
      : undefined,
    tags: row.tags || [],
    status: row.status,
    views: row.view_count || 0,
    readTime: row.reading_time ? `${row.reading_time} min` : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isPinned: !!row.is_pinned,
    isFeatured: !!row.is_featured,
    isTrending: !!row.is_trending,
    isBreaking: !!row.is_breaking,
    isSuggestion: !!row.is_suggestion,
  };
}

export async function getArticles({
  page = 1,
  status,
  limit = 12,
  authorId,
  search,
  date,
}: GetArticlesParams): Promise<GetArticlesResponse> {
  const result = await fetchArticlesFromDb({
    page,
    limit,
    // Public storefront: always published-only unless a caller explicitly
    // asks for something else.
    status: status || 'published',
    author_id: authorId,
    search,
    date,
  });

  const articles = result.articles.map(mapDbArticle);

  return {
    articles,
    total: result.total,
    totalPages: result.totalPages,
    currentPage: result.currentPage,
    limit,
  };
}

/**
 * Articles scoped to a category (and, optionally, one specific
 * subcategory within it) - resolved against the real `categories` table,
 * not the static nav config. A category page includes articles from ALL
 * of that category's subcategories, so nothing published under a
 * subcategory goes missing from its parent's listing; a subcategory page
 * is scoped to exactly that one subcategory.
 *
 * Returns an empty result (never throws) when the slug doesn't match any
 * active category/subcategory in the database - callers should render
 * the "no articles" empty state in that case, same as a real category
 * with nothing published in it yet.
 */
export async function getArticlesByCategory({
  categorySlug,
  subcategorySlug,
  page = 1,
  limit = 12,
  search,
  date,
}: GetArticlesByCategoryParams): Promise<GetArticlesResponse> {
  const empty: GetArticlesResponse = { articles: [], total: 0, totalPages: 0, currentPage: page, limit };

  let categoryIds: string[];

  if (subcategorySlug) {
    const resolved = await getSubcategoryBySlug(categorySlug, subcategorySlug);
    if (!resolved) return empty;
    categoryIds = [resolved.subcategory.id];
  } else {
    const resolved = await getCategoryWithChildIdsBySlug(categorySlug);
    if (!resolved) return empty;
    categoryIds = [resolved.category.id, ...resolved.childIds];
  }

  const result = await fetchArticlesFromDb({
    page,
    limit,
    categoryIds,
    search,
    date,
    status: 'published',
  });

  return {
    articles: result.articles.map(mapDbArticle),
    total: result.total,
    totalPages: result.totalPages,
    currentPage: result.currentPage,
    limit,
  };
}

/**
 * Full-text-ish search across published articles' title/excerpt/content.
 * Returns an empty result (never throws) for a query under 2 characters,
 * so callers can render "type at least 2 characters" instead of an error.
 */
export async function searchArticles({
  query,
  page = 1,
  limit = 10,
}: {
  query: string;
  page?: number;
  limit?: number;
}): Promise<GetArticlesResponse> {
  const result = await searchArticlesInDb({ query, page, limit, status: 'published' });

  return {
    articles: result.articles.map(mapDbArticle),
    total: result.total,
    totalPages: result.totalPages,
    currentPage: result.currentPage,
    limit,
  };
}

export async function getArticle({
  slug,
}: {
  locale: string;
  slug: string;
}): Promise<Article | null> {
  const row = await fetchArticleBySlugFromDb(slug);
  // getArticleBySlug() doesn't filter by status - guard here so a direct
  // link to a draft/scheduled/archived article never renders publicly.
  if (!row || row.status !== 'published') return null;

  // incrementViewCount() (article-service.ts) existed already, wired up
  // to the atomic RPC in migrations/18_atomic_counters.sql, but nothing
  // in the app ever actually called it - this is the only place a public
  // reader's article view is resolved, so it's the right (and only)
  // place to count one. Fire-and-forget: a logging hiccup here should
  // never slow down or fail the page render.
  incrementViewCount(row.id).catch((err) => {
    console.error('getArticle: view count increment failed for', row.id, err);
  });

  return mapDbArticle(row);
}

/**
 * "Related articles" for the article modal - other published articles in
 * the same section (see getRelatedCategoryIds), ranked instead of just
 * "most recent", so a busy category doesn't always surface the same
 * handful of newest posts and nothing else. Pulls a wider candidate pool
 * (`poolSize`) from the DB - already roughly recency/pin-ordered, see
 * article-service.ts's getArticles() - then re-ranks in memory by a
 * simple, explainable score:
 *
 *   +3  candidate is in the exact same category/subcategory as `article`
 *       (not just the same top-level section) - the tightest match
 *   +1  per shared tag with `article`, capped at +3 - topical overlap
 *       matters even across different subcategories of the same section
 *   +2  published within the last 7 days, +1 within the last 30 - keeps
 *       results fresh instead of forever surfacing the same old top posts
 *
 * Ties (including "no signal at all" - a same-section article sharing no
 * tags, published long ago) fall back to view count, then publish date,
 * so the list is still deterministic and still favors real content over
 * arbitrary DB order.
 */
export async function getRelatedArticles({
  article,
  limit = 4,
  poolSize = 20,
}: {
  article: Article;
  limit?: number;
  poolSize?: number;
}): Promise<Article[]> {
  if (!article.category?.id) return [];

  const categoryIds = await getRelatedCategoryIds(article.category.id);
  const { articles: rows } = await fetchArticlesFromDb({
    categoryIds,
    status: 'published',
    limit: poolSize,
  });

  const currentTags = new Set(article.tags || []);
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const scored = rows
    .map(mapDbArticle)
    .filter((a) => a.slug !== article.slug)
    .map((a) => {
      let score = 0;
      if (a.category?.id === article.category!.id) score += 3;

      const sharedTags = (a.tags || []).filter((t) => currentTags.has(t)).length;
      score += Math.min(sharedTags, 3);

      const ageMs = now - new Date(a.createdAt).getTime();
      if (ageMs <= 7 * DAY_MS) score += 2;
      else if (ageMs <= 30 * DAY_MS) score += 1;

      return { article: a, score };
    })
    .sort((x, y) => {
      if (y.score !== x.score) return y.score - x.score;
      if (y.article.views !== x.article.views) return y.article.views - x.article.views;
      return new Date(y.article.createdAt).getTime() - new Date(x.article.createdAt).getTime();
    });

  return scored.slice(0, limit).map((s) => s.article);
}

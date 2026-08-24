-- ============================================
-- PERFORMANCE: INDEXES FOR THE ARTICLES TABLE
-- ============================================
-- Run this in your Supabase SQL Editor (same as every other file in
-- migrations/).
--
-- WHY THIS MATTERS: `articles` (migrations/01_create_tables.sql) has never
-- had a single index beyond its primary key and the implicit unique index
-- on `slug`. Every listing query on the site - the homepage, every
-- category and subcategory page, the sidebar, breaking news, trending,
-- featured, pinned, suggested, related articles, the admin article list,
-- the sitemap - filters on `status` and/or one of the boolean flags
-- (is_breaking/is_featured/is_pinned/is_suggestion/is_trending), often
-- combined with `category_id` or `author_id`, and sorts by
-- is_pinned/published_at/created_at. Without an index, Postgres has to
-- read and sort the ENTIRE table for every one of those queries, on every
-- single page view, and it only gets slower as more articles get added -
-- this is very likely a real, growing contributor to "the app loads
-- slowly" that no amount of application-code caching fixes, because the
-- bottleneck is the database read itself.
--
-- Safe to run any time: CREATE INDEX IF NOT EXISTS only adds indexes, it
-- doesn't touch existing data or drop anything. On a small/empty table
-- this runs instantly; on a large one it may take a few seconds but is
-- still a normal, safe DDL operation.
-- ============================================

-- The single highest-traffic query pattern on the whole site: "articles
-- with this status, pinned first, then newest published, then newest
-- created" - this is exactly what getArticles() in article-service.ts
-- runs on the homepage, the archives page, and (combined with the
-- category index below) every category/subcategory page's sidebar.
CREATE INDEX IF NOT EXISTS idx_articles_status_pinned_published_created
  ON articles (status, is_pinned DESC, published_at DESC NULLS LAST, created_at DESC);

-- Same query pattern, scoped to a category (and its subcategories) - the
-- main list on every category/subcategory page.
CREATE INDEX IF NOT EXISTS idx_articles_category_status_pinned_published
  ON articles (category_id, status, is_pinned DESC, published_at DESC NULLS LAST);

-- An author's own article list (author profile pages, admin "my
-- articles").
CREATE INDEX IF NOT EXISTS idx_articles_author_status
  ON articles (author_id, status);

-- Date-filtered listings (the Archives page's calendar filter).
CREATE INDEX IF NOT EXISTS idx_articles_status_created_at
  ON articles (status, created_at DESC);

-- getBreakingArticles() / the header's breaking-news ticker - partial
-- index (only rows actually flagged) keeps this tiny regardless of how
-- large `articles` grows, since the vast majority of rows have this flag
-- false.
CREATE INDEX IF NOT EXISTS idx_articles_breaking
  ON articles (status, published_at DESC) WHERE is_breaking = true;

-- getFeaturedArticles() - the homepage's featured section.
CREATE INDEX IF NOT EXISTS idx_articles_featured
  ON articles (status, published_at DESC) WHERE is_featured = true;

-- getPinnedArticles() - "À la une".
CREATE INDEX IF NOT EXISTS idx_articles_pinned
  ON articles (status, published_at DESC) WHERE is_pinned = true;

-- getSuggestedArticles() - "Suggestions".
CREATE INDEX IF NOT EXISTS idx_articles_suggestion
  ON articles (status, published_at DESC) WHERE is_suggestion = true;

-- getTrendingArticles() - sorted by view_count instead of published_at.
CREATE INDEX IF NOT EXISTS idx_articles_trending
  ON articles (status, view_count DESC) WHERE is_trending = true;

-- publishDueScheduledArticles() - the lazy auto-publish check that now
-- runs at most once a minute (see article-service.ts), but still scans
-- for due rows every time it does run. Partial on status='scheduled'
-- keeps this index tiny.
CREATE INDEX IF NOT EXISTS idx_articles_scheduled_due
  ON articles (scheduled_publish_at) WHERE status = 'scheduled';

-- getRelatedArticles() - "you might also like" on the article detail
-- page, filtered by category and excluding the current article.
CREATE INDEX IF NOT EXISTS idx_articles_related
  ON articles (category_id, status, published_at DESC);

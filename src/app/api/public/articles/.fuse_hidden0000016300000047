import { NextResponse } from 'next/server';
import { getArticles, getArticlesByCategory, mapDbArticle } from '@/lib/api/articles';
import { getBreakingArticles } from '@/lib/services/article-service';

// Public, published-only articles endpoint for client components that
// need article data in the browser (e.g. author/[id]/page.tsx,
// weather/page.tsx). Those used to import getArticles() from
// @/lib/api/articles directly, but that now calls the real,
// service-role-backed database - safe only server-side (see
// src/lib/supabase/admin.ts) - so a 'use client' component has to go
// through a route like this one instead.
// Reads request.url below so Next already treats this as dynamic, but
// making it explicit keeps it consistent with the other admin/public
// data routes hardened against static caching this pass.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'fr';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    // Scopes the listing to one author's own published articles (the
    // author profile page) - omit to get the unscoped sitewide listing
    // (also used by that same page for its sidebar's Tendances/Dernières
    // actualités, which should stay sitewide, not author-scoped).
    const authorId = searchParams.get('authorId') || undefined;
    const search = searchParams.get('search') || undefined;
    // Optional category/subcategory scoping - used by weather/page.tsx to
    // pull the "Météo" subcategory's real articles from a 'use client'
    // component (which can't call getArticlesByCategory() directly - see
    // the comment at the top of this file for why).
    const categorySlug = searchParams.get('categorySlug') || undefined;
    const subcategorySlug = searchParams.get('subcategorySlug') || undefined;
    // Articles flagged is_breaking, for the header's breaking-news ticker
    // (a 'use client' component - can't call getBreakingArticles()
    // directly, same reasoning as everything else in this file).
    const breaking = searchParams.get('breaking') === 'true';

    if (breaking) {
      const rows = await getBreakingArticles(limit);
      return NextResponse.json({ articles: rows.map(mapDbArticle) });
    }

    const result = categorySlug
      ? await getArticlesByCategory({ locale, categorySlug, subcategorySlug, page, limit, search })
      : await getArticles({ locale, page, limit, authorId, search });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching public articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

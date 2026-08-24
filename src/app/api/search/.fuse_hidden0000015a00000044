import { NextResponse } from 'next/server';
import { searchArticles } from '@/lib/api/articles';

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';


// Public search endpoint - backs both the header SearchBar's live dropdown
// and the /search results page. Always published-only (searchArticles()
// in lib/api/articles.ts enforces that), so this is safe to call
// unauthenticated from a 'use client' component.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const result = await searchArticles({ query: q, page, limit });

    return NextResponse.json({
      results: result.articles,
      total: result.total,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    });
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json({ results: [], total: 0, totalPages: 0, currentPage: 1 });
  }
}

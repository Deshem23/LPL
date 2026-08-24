import { searchArticles } from '@/lib/api/articles';
import { SearchClient } from './search-client';

// See the matching comment in categories/[slug]/page.tsx.
export const dynamic = 'force-dynamic';

interface SearchPageProps {
  params: { locale: string };
  searchParams: { q?: string; page?: string };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q || '';
  return {
    title: query ? `Résultats pour "${query}" - News Platform` : 'Recherche - News Platform',
  };
}

export default async function SearchPage({
  params: { locale },
  searchParams,
}: SearchPageProps) {
  const query = searchParams.q || '';
  const page = parseInt(searchParams.page || '1');

  // A server component can call the DB-backed api layer directly and
  // safely (see the comment at the top of lib/api/articles.ts) - no need
  // to round-trip through /api/search here, that route exists for the
  // 'use client' SearchBar dropdown.
  const result = query
    ? await searchArticles({ query, page, limit: 10 })
    : { articles: [], total: 0, totalPages: 0, currentPage: 1, limit: 10 };

  return (
    <SearchClient
      locale={locale}
      query={query}
      articles={result.articles}
      total={result.total}
      totalPages={result.totalPages}
      currentPage={result.currentPage}
    />
  );
}

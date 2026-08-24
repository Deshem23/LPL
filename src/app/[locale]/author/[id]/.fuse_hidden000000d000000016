import { notFound } from 'next/navigation';
import { getAuthorProfile } from '@/lib/services/user-service';
import { getArticles } from '@/lib/api/articles';
import { AuthorClient } from './author-client';

// This page used to be 100% client-rendered - a 'use client' component
// that fetched the author, their articles, AND the sidebar's sitewide
// articles all in useEffect hooks after mount. Every other content page
// (home, category, subcategory) instead does its data fetching in a
// Server Component and hands the result to a client component for the
// interactive parts - so unlike those pages, this one always rendered a
// loading skeleton first (including an empty sidebar) instead of the
// real content on first paint. This brings it in line with that same
// pattern: fetch here, pass props down to author-client.tsx.
export const dynamic = 'force-dynamic';

interface AuthorPageProps {
  params: { locale: string; id: string };
  searchParams: { search?: string; page?: string };
}

export default async function AuthorPage({
  params: { locale, id },
  searchParams,
}: AuthorPageProps) {
  const author = await getAuthorProfile(id);

  if (!author) {
    notFound();
  }

  const page = parseInt(searchParams.page || '1');
  const search = searchParams.search || '';

  const { articles, total, totalPages } = await getArticles({
    locale,
    page,
    limit: 11,
    authorId: id,
    search: search || undefined,
  });

  // Site-wide latest articles for the sidebar's Trending/Latest widgets -
  // same call every other page's sidebar makes, not scoped to this author
  // (see the matching comment in categories/[slug]/page.tsx).
  let sidebarArticles = articles;
  try {
    const sitewide = await getArticles({ locale, limit: 20 });
    sidebarArticles = sitewide.articles;
  } catch (error) {
    console.error('Error fetching site-wide sidebar articles:', error);
  }

  return (
    <AuthorClient
      locale={locale}
      author={author}
      articles={articles}
      sidebarArticles={sidebarArticles}
      total={total}
      totalPages={totalPages}
      currentPage={page}
      search={search}
    />
  );
}

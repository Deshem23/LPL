// Server Component: fetches the article server-side and passes it down
// to the (client) modal. It used to be a 'use client' component that
// called getArticle() directly in a useEffect - since getArticle() now
// hits the real, service-role-backed database, that would have broken
// this page in the browser (see src/lib/supabase/admin.ts). Loading UI
// is provided by the existing src/app/[locale]/articles/loading.tsx,
// which Next.js applies to this nested route automatically.
import { notFound } from 'next/navigation';
import { getArticle, getRelatedArticles } from '@/lib/api/articles';
import { ArticleModal } from '@/components/articles/article-modal';

// revalidate: 30 (was force-dynamic) - see [locale]/layout.tsx's own
// comment for the full reasoning. Note for whoever's editing an article
// and immediately re-checking the public page: your own edit can now take
// up to ~30 seconds to show up here, instead of being instant - that's
// this cache working as intended, not a bug. If that ever gets in the way
// while actively editing, a hard refresh doesn't bypass server-side ISR
// caching, but waiting the ~30 seconds (or lowering this number) will.
export const revalidate = 30;

interface ArticlePageProps {
  params: { locale: string; slug: string };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { locale, slug } = params;
  const article = await getArticle({ locale, slug });

  if (!article) {
    notFound();
  }

  // "Related articles" for the modal, below the author card - up to 4,
  // ranked (not just "most recent") - see getRelatedArticles() in
  // lib/api/articles.ts for the actual scoring logic (same
  // category/subcategory, shared tags, recency, view count as a
  // tiebreaker).
  const related = await getRelatedArticles({ article, limit: 4 });
  const relatedArticles = related.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    coverImage: a.coverImage,
    createdAt: a.createdAt,
  }));

  return <ArticleModal article={article} locale={locale} relatedArticles={relatedArticles} />;
}

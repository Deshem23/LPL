// Server Component: fetches the article server-side and passes it down
// to the (client) modal. It used to be a 'use client' component that
// called getArticle() directly in a useEffect - since getArticle() now
// hits the real, service-role-backed database, that would have broken
// this page in the browser (see src/lib/supabase/admin.ts). Loading UI
// is provided by the existing src/app/[locale]/articles/loading.tsx,
// which Next.js applies to this nested route automatically.
import { notFound } from 'next/navigation';
import { getArticle, mapDbArticle } from '@/lib/api/articles';
import { getArticles as getArticlesFromDb } from '@/lib/services/article-service';
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

  // "Related articles" for the modal, below the author card - other
  // published articles with the same category_id as this one (whether
  // that's a top-level category or a subcategory - article.category.id
  // is already exactly the right id to filter on either way, see the
  // category_id note in article-service.ts), current article excluded.
  // Queried directly via article-service.ts's categoryIds filter instead
  // of the deprecated slug-based `category` param some routes still use,
  // and done here server-side so the modal itself doesn't need its own
  // client-side fetch for it.
  let relatedArticles: { id: string; title: string; slug: string; coverImage?: string; createdAt: string }[] = [];
  if (article.category?.id) {
    const { articles: relatedRows } = await getArticlesFromDb({
      categoryIds: [article.category.id],
      status: 'published',
      limit: 5,
    });
    relatedArticles = relatedRows
      .map(mapDbArticle)
      .filter((a) => a.slug !== slug)
      .slice(0, 4)
      .map((a) => ({ id: a.id, title: a.title, slug: a.slug, coverImage: a.coverImage, createdAt: a.createdAt }));
  }

  return <ArticleModal article={article} locale={locale} relatedArticles={relatedArticles} />;
}

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import type { Article } from '@/lib/api/articles';

interface ArticleCardProps {
  article: Article;
  locale: string;
}

// Shared horizontal article card used by the "All Articles" and tag
// listing pages. This component was imported in both places
// (src/app/[locale]/articles/page.tsx and
// src/app/[locale]/tags/[slug]/page.tsx) but never actually existed on
// disk - both pages have been failing to type-check (and would have
// failed to build) until now. Styled to match the equivalent card
// already used on category pages (see RectangularArticleCard in
// src/app/[locale]/categories/[slug]/category-client.tsx).
export function ArticleCard({ article, locale }: ArticleCardProps) {
  const formattedDate = new Date(article.createdAt).toLocaleDateString(locale || 'fr', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`/${locale}/articles/${article.slug}`} className="block group">
      <div className="flex flex-col md:flex-row gap-4 p-4 rounded-xl border bg-card hover:shadow-md transition-all hover:border-primary/20">
        <div className="relative md:w-64 h-48 md:h-auto flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          {article.coverImage ? (
            <Image
              src={article.coverImage}
              alt={article.title}
              fill
              sizes="(min-width: 768px) 256px, 100vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5" />
          )}
          {article.category && (
            <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white text-xs rounded-full">
              {article.category.name}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{article.author.name}</span>
            <span>•</span>
            <span>{formattedDate}</span>
            {article.readTime && (
              <>
                <span>•</span>
                <span>{article.readTime}</span>
              </>
            )}
          </div>
          <h3 className="mt-2 text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2">
            {article.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {article.excerpt}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              👁️ {article.views || 0}
            </span>
            {article.tags && article.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <span>🏷️</span>
                {article.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-muted-foreground">
                    #{tag}
                  </span>
                ))}
                {article.tags.length > 3 && (
                  <span className="text-muted-foreground">+{article.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="hidden md:flex items-center justify-center pl-4 border-l">
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}

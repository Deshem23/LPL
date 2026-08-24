import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, User } from 'lucide-react';
import type { Article } from '@/lib/api/articles';

interface LatestNewsProps {
  locale: string;
  articles: Article[];
}

export function LatestNews({ locale, articles }: LatestNewsProps) {
  if (articles.length === 0) return null;

  return (
    <div className="space-y-4">
      {articles.map((article) => {
        const formattedDate = new Date(article.createdAt).toLocaleDateString(locale || 'fr', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });

        return (
          <Link key={article.id} href={`/${locale}/articles/${article.slug}`} className="block group">
            <div className="apple-card flex flex-col gap-4 p-4 sm:flex-row">
              {article.coverImage && (
                <div className="relative h-40 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-40">
                  <Image
                    src={article.coverImage}
                    alt={article.title}
                    fill
                    sizes="160px"
                    className="object-cover image-zoom"
                  />
                </div>
              )}
              <div className="flex-1">
                {article.category && (
                  <span className="text-xs font-semibold text-primary">
                    {article.category.name}
                  </span>
                )}
                <h3 className="headline-serif mt-1 font-semibold group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {article.excerpt}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {article.author.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formattedDate}
                  </span>
                  {article.readTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.readTime}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

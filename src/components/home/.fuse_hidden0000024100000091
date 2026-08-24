'use client';

import Link from 'next/link';
import type { Article } from '@/lib/api/articles';

interface BreakingNewsProps {
  locale: string;
  articles?: Article[];
}

export function BreakingNews({ locale, articles }: BreakingNewsProps) {
  // Handle undefined or empty articles
  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <div className="feature-card flex items-center gap-4 overflow-hidden p-3 bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-950/30 dark:to-red-950/10 border-red-200 dark:border-red-800/30">
      <div className="flex items-center gap-2 shrink-0">
        <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
        <span className="font-bold text-red-600 dark:text-red-400 text-sm uppercase tracking-wider">Breaking</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="animate-scroll whitespace-nowrap">
          {articles.map((news, index) => (
            <Link
              key={news.id}
              href={`/${locale}/articles/${news.slug}`}
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors inline-block"
            >
              {news.title}
              {index < articles.length - 1 && (
                <span className="mx-4 text-muted-foreground/30">•</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

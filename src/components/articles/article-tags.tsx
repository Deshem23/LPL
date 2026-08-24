'use client';

import Link from 'next/link';
import { Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ArticleTagsProps {
  tags: string[];
  locale?: string;
}

export function ArticleTags({ tags, locale = 'fr' }: ArticleTagsProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tag className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-muted-foreground mr-1">Tags :</span>
      {tags.map((tag) => (
        <Link key={tag} href={`/${locale}/tags/${tag.toLowerCase().replace(/\s+/g, '-')}`}>
          <Badge 
            variant="secondary" 
            className="hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
          >
            #{tag}
          </Badge>
        </Link>
      ))}
    </div>
  );
}

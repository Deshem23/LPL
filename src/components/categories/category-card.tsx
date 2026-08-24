'use client';

import { Category } from '@/lib/api/categories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CategoryCardProps {
  category: Category;
  locale: string;
}

export function CategoryCard({ category, locale }: CategoryCardProps) {
  const getColorClasses = (color?: string) => {
    if (!color) return 'bg-primary/10 text-primary';
    // Map hex to tailwind-like classes
    const colorMap: Record<string, string> = {
      '#FF6B6B': 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
      '#4ECDC4': 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300',
      '#45B7D1': 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
      '#96CEB4': 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300',
      '#FFEAA7': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
      '#DDA0DD': 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
      '#FF8A5C': 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
      '#A8E6CF': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    };
    return colorMap[color] || 'bg-primary/10 text-primary';
  };

  return (
    // Plain <a>, not next/link's <Link> - forces a full browser navigation
    // instead of a soft client-side one. Next's Router Cache can otherwise
    // serve a stale prefetched RSC payload for this category on a soft
    // nav (the "click gives 404, refresh works" bug) - see the matching
    // fix + comment in layout/header.tsx.
    <a href={`/${locale}/categories/${category.slug}`}>
      <Card className="h-full transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">{category.name}</CardTitle>
          {category.count !== undefined && (
            <span className="text-xs text-muted-foreground">
              {category.count} articles
            </span>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {category.description || `Browse all ${category.name} news`}
          </p>
          <div className="mt-3">
            <span className={`inline-block px-3 py-1 text-xs rounded-full ${getColorClasses(category.color)}`}>
              {category.slug}
            </span>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

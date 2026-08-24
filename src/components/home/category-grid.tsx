'use client';

import {
  FaChartLine,
  FaHandsHelping,
  FaLandmark,
  FaHeartbeat,
  FaGlobe,
  FaMicrochip,
  FaFutbol,
  FaMagic
} from 'react-icons/fa';
import { useCategories } from '@/components/providers/categories-provider';

// Map category slugs to React Icons
const categoryIcons: Record<string, React.ReactNode> = {
  economie: <FaChartLine className="h-6 w-6" />,
  societe: <FaHandsHelping className="h-6 w-6" />,
  politique: <FaLandmark className="h-6 w-6" />,
  sante: <FaHeartbeat className="h-6 w-6" />,
  international: <FaGlobe className="h-6 w-6" />,
  technologie: <FaMicrochip className="h-6 w-6" />,
  sport: <FaFutbol className="h-6 w-6" />,
  insolite: <FaMagic className="h-6 w-6" />,
};

// Compact category colors - more subtle
const categoryColors: Record<string, string> = {
  economie: 'hover:bg-blue-50 dark:hover:bg-blue-950/30',
  societe: 'hover:bg-purple-50 dark:hover:bg-purple-950/30',
  politique: 'hover:bg-red-50 dark:hover:bg-red-950/30',
  sante: 'hover:bg-green-50 dark:hover:bg-green-950/30',
  international: 'hover:bg-pink-50 dark:hover:bg-pink-950/30',
  technologie: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/30',
  sport: 'hover:bg-yellow-50 dark:hover:bg-yellow-950/30',
  insolite: 'hover:bg-orange-50 dark:hover:bg-orange-950/30',
};

interface CategoryGridProps {
  locale: string;
}

export function CategoryGrid({ locale }: CategoryGridProps) {
  // Mirrors the same active, admin-managed categories as the navbar
  // dropdown (see header.tsx) instead of a hardcoded 8-category list -
  // any category created in /admin/categories shows up here too. Read
  // from the CategoriesProvider context the [locale] layout already
  // populated server-side for this request, instead of this component
  // fetching /api/categories itself on mount - that used to be a second
  // full round trip AFTER the homepage had already rendered, plus (since
  // that route computes article counts this grid never displays) a full
  // unbounded `articles` table scan on every homepage view, for nothing.
  const categories = useCategories();

  return (
    <div className="w-full">
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
        {categories.map((category) => {
          const icon = categoryIcons[category.slug] || <FaMagic className="h-6 w-6" />;
          const colorClass = categoryColors[category.slug] || '';

          return (
            // Plain <a>, not next/link's <Link> - see the matching
            // comment in category-card.tsx / layout/header.tsx for why.
            <a key={category.slug} href={`/${locale}/categories/${category.slug}`}>
              <div className={`group flex flex-col items-center gap-2 rounded-xl px-2 py-4 transition-all ${colorClass} hover:scale-105`}>
                <div className="text-muted-foreground group-hover:text-primary transition-colors">
                  {icon}
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
                  {category.label}
                </span>
                {category.subcategories && category.subcategories.length > 0 && (
                  <span className="text-[9px] text-muted-foreground/60">
                    {category.subcategories.length}
                  </span>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

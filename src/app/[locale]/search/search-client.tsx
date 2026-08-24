'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, ChevronLeft, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import type { Article } from '@/lib/api/articles';

interface SearchClientProps {
  locale: string;
  query: string;
  articles: Article[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export function SearchClient({
  locale,
  query,
  articles,
  total,
  totalPages,
  currentPage,
}: SearchClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(query);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    router.push(`/${locale}/search?${params.toString()}`);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('page', page.toString());
    router.push(`/${locale}/search?${params.toString()}`);
  };

  return (
    <div className="container mx-auto px-4 page-container">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">Recherche</h1>
        <div className="h-px w-full bg-gradient-to-r from-primary/30 to-transparent mt-2 mb-3" />
        {query && (
          <p className="text-sm text-muted-foreground">
            {total} résultat{total > 1 ? 's' : ''} pour «&nbsp;{query}&nbsp;»
          </p>
        )}
      </div>

      <form onSubmit={handleSearch} className="mb-8 flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher des articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>
        <Button type="submit">Rechercher</Button>
      </form>

      {!query ? (
        <EmptyState
          icon={Search}
          title="Que recherchez-vous ?"
          description="Entrez un mot-clé ci-dessus pour trouver des articles."
        />
      ) : query.trim().length < 2 ? (
        <EmptyState
          icon={Search}
          title="Continuez à taper"
          description="Entrez au moins 2 caractères pour lancer la recherche."
        />
      ) : articles.length > 0 ? (
        <div className="space-y-4 max-w-3xl">
          {articles.map((article) => (
            <SearchResultCard key={article.id} article={article} locale={locale} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="Aucun résultat"
          description={`Aucun article ne correspond à « ${query} ». Essayez un autre mot-clé.`}
        />
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t pt-6 max-w-3xl">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            Page {currentPage} sur {totalPages} ({total} résultats au total)
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchResultCard({ article, locale }: { article: Article; locale: string }) {
  const formattedDate = new Date(article.createdAt).toLocaleDateString(locale || 'fr', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`/${locale}/articles/${article.slug}`} className="block group">
      <div className="flex flex-col md:flex-row gap-4 p-4 rounded-xl border bg-card hover:shadow-md transition-all hover:border-primary/20">
        <div className="relative md:w-48 h-40 md:h-auto flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          {article.coverImage ? (
            <Image
              src={article.coverImage}
              alt={article.title}
              fill
              sizes="(min-width: 768px) 192px, 100vw"
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
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
        </div>

        <div className="hidden md:flex items-center justify-center pl-4 border-l">
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}

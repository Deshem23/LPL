'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

export function SearchBar() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Header');
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedQuery.length > 2) {
      fetchSearchResults(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  const fetchSearchResults = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Was pushing the unprefixed `/search?q=...` - the middleware's
      // locale-redirect (STEP 3 in middleware.ts) then rewrote that to
      // `/${locale}/search` while dropping the `?q=...` query string
      // entirely, so submitting a search always landed on the empty
      // "Que recherchez-vous ?" state no matter what was typed. Pushing
      // the already-locale-prefixed URL sidesteps that redirect (and its
      // now-fixed query-string bug) altogether.
      router.push(`/${locale}/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={searchRef} className="relative">
      {!isOpen ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 transition-all"
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
        >
          <Search className="h-5 w-5" />
        </Button>
      ) : (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[300px] md:w-[400px]">
          <form onSubmit={handleSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="search"
              placeholder={t('search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-10 h-11 text-base bg-white dark:bg-[#2a3a4a] text-foreground dark:text-white placeholder:text-muted-foreground border-2 border-white/20 dark:border-white/10 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-full shadow-lg"
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </form>

          {query.length > 2 && (
            <div className="absolute mt-2 w-full rounded-xl border bg-background shadow-xl overflow-hidden">
              {isLoading ? (
                <div className="p-5 text-center text-sm text-muted-foreground">
                  Recherche...
                </div>
              ) : results.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  {results.map((result) => (
                    <a
                      key={result.id}
                      href={`/${result.locale || 'fr'}/articles/${result.slug}`}
                      className="block px-5 py-4 hover:bg-muted transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <p className="font-medium text-base">{result.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{result.excerpt}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-center text-sm text-muted-foreground">
                  Aucun résultat trouvé
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

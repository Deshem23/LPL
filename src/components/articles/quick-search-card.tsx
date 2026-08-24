'use client';

import { useEffect, useState } from 'react';
import { FiSearch, FiZap, FiArrowRight, FiX } from 'react-icons/fi';

const SUGGESTIONS = ['Politique', 'Économie', 'Sport', 'Technologie', 'Santé', 'International'];

interface QuickSearchCardProps {
  locale: string;
  initialSearch?: string;
}

// Prominent, animated search entry point for the Archives page - replaces
// the old plain <input> + "Rechercher" button, which had no visual
// hierarchy of its own on a page that's otherwise just a bare list. The
// idle "ping" ring and the cycling suggestion text both go away as soon
// as the visitor focuses or types, so nothing distracts once they're
// actually searching.
export function QuickSearchCard({ locale, initialSearch }: QuickSearchCardProps) {
  const [value, setValue] = useState(initialSearch || '');
  const [focused, setFocused] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  useEffect(() => {
    if (value || focused) return;
    const timer = setInterval(() => {
      setSuggestionIndex((i) => (i + 1) % SUGGESTIONS.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [value, focused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    // Plain full navigation, not router.push - the list below is a
    // Server Component re-fetching off ?search=, same full-navigation
    // pattern used throughout this app for anything backed by fetched
    // data (see the matching comment in archive-calendar.tsx).
    window.location.href = `/${locale}/articles${q ? `?search=${encodeURIComponent(q)}` : ''}`;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground shadow-lg sm:p-6">
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />

      <div className="relative flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary-foreground/80">
        <FiZap className="h-3.5 w-3.5" />
        Recherche rapide
      </div>

      <form onSubmit={handleSubmit} className="relative mt-3">
        <div
          className={`flex items-center gap-2 rounded-xl bg-white/15 px-4 py-3 ring-1 ring-white/20 backdrop-blur-sm transition-all duration-300 ${
            focused ? 'scale-[1.01] bg-white/20 ring-2 ring-white/70' : ''
          }`}
        >
          <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
            <FiSearch className={`h-4 w-4 transition-transform duration-300 ${focused ? 'scale-110' : ''}`} />
            {!value && !focused && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/40" />
            )}
          </span>
          <div className="relative flex-1">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder=" "
              aria-label="Rechercher un article"
              className="w-full bg-transparent text-sm text-white placeholder-transparent outline-none"
            />
            {!value && (
              <span
                key={suggestionIndex}
                className="pointer-events-none absolute inset-0 flex animate-fade-in items-center text-sm text-white/70"
              >
                Rechercher « {SUGGESTIONS[suggestionIndex]} »...
              </span>
            )}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => setValue('')}
              className="flex-shrink-0 rounded-full p-1 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Effacer"
            >
              <FiX className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-transform hover:scale-105"
          >
            Aller
            <FiArrowRight className="h-3 w-3" />
          </button>
        </div>
      </form>
    </div>
  );
}

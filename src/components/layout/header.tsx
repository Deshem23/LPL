'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { MobileMenu } from '@/components/layout/mobile-menu';
import { SearchBar } from '@/components/layout/search-bar';
import { Button } from '@/components/ui/button';
import { Menu, X, ChevronDown } from 'lucide-react';

interface TickerAd {
  id: string;
  title: string;
  textContent?: string;
  linkUrl?: string;
}

interface BreakingArticle {
  id: string;
  title: string;
  slug: string;
}

interface NavSubcategory {
  slug: string;
  label: string;
}

interface NavCategory {
  slug: string;
  label: string;
  subcategories: NavSubcategory[];
}

interface HeaderProps {
  initialCategories?: NavCategory[];
  initialBreakingArticles?: BreakingArticle[];
  initialTickerAds?: TickerAd[];
}

// Categories, breaking-news articles and the "Annonce" ticker ads all
// used to be fetched here, client-side, via three separate useEffect
// calls AFTER this component mounted - so every page's header started
// empty and only filled in once those round trips resolved (each with
// its own {cache: 'no-store'} fetch). The parent [locale]/layout.tsx is
// already an async Server Component that re-runs on every request (see
// its own comment), so it now fetches all three server-side, in
// parallel, and passes them in as initial*  props - the header arrives
// fully populated in the very first HTML response instead.
export function Header({
  initialCategories = [],
  initialBreakingArticles = [],
  initialTickerAds = [],
}: HeaderProps) {
  const pathname = usePathname();
  const t = useTranslations('Header');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [tickerAds] = useState<TickerAd[]>(initialTickerAds);
  const [categories] = useState<NavCategory[]>(initialCategories);
  const [breakingArticles] = useState<BreakingArticle[]>(initialBreakingArticles);

  const locale = pathname?.split('/')[1] || 'fr';

  // Fire-and-forget view tracking for the ticker ads this page was
  // server-rendered with - once per ad per mount, same as before, just
  // no longer gated behind the client-side fetch that used to deliver
  // this list in the first place.
  useEffect(() => {
    initialTickerAds.forEach((ad) => {
      fetch(`/api/ads/${ad.id}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'view' }),
      }).catch(() => {});
    });
    // Intentionally only on mount (matches the previous "fires once when
    // the ad list first loads" behavior) - not re-run if initialTickerAds
    // changes identity, since this component's props only ever change via
    // a full page navigation anyway (this app uses plain <a> links, not
    // client-side <Link> transitions, for exactly this kind of freshness
    // reason - see the nav links below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTickerClick = useCallback((adId: string) => {
    fetch(`/api/ads/${adId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'click' }),
    }).catch(() => {});
  }, []);

  const handleDropdownEnter = (slug: string) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setActiveDropdown(slug);
  };

  const handleDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const isCategoryActive = (slug: string) => {
    return pathname?.includes(`/categories/${slug}`);
  };

  // toLocaleDateString('fr-FR', { weekday: 'long', ... }) returns the
  // weekday lowercase ("dimanche 23 août 2026") - correct French
  // orthography for running prose, but not for a standalone header label,
  // which reads better capitalized ("Dimanche 23 août 2026"). Only the
  // very first character is uppercased; the rest of the string (month
  // name, etc.) is left as-is.
  const formattedDateRaw = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedDate = formattedDateRaw.charAt(0).toUpperCase() + formattedDateRaw.slice(1);

  return (
    <>
      {/* Top Bar - Breaking News Ticker - Dark Blue Background - real
          articles flagged is_breaking in the admin; hidden entirely when
          there are none, rather than showing anything made up. Was
          `hidden md:block` - completely invisible below the md (768px)
          breakpoint, so on any phone or narrow window this looked like
          "no breaking news" even when real breaking articles existed.
          Now visible at every width; the date column (which needs more
          horizontal room) is what hides on small screens instead. */}
      {breakingArticles.length > 0 && (
        <div className="bg-[#1a2a3a] text-white border-b border-[#2a3a4a]">
          {/* Flattened to a single flex row - "BREAKING", the separator,
              the ticker track and the date are all DIRECT children here,
              exactly like the working "Annonce" ad ticker below. The
              previous version nested the ticker two flex levels deep
              (inside its own "BREAKING | ..." wrapper div, itself inside
              this row), and even with an explicit height on the ticker's
              own container, that extra nesting kept producing an empty
              bar in practice. Matching the ad ticker's flat structure
              exactly (including `self-stretch`, which the ad ticker
              already proves works) removes that variable entirely. */}
          <div className="container flex h-9 md:h-10 items-center gap-2 md:gap-3 text-xs md:text-sm">
            <span className="font-bold animate-pulse text-red-500 shrink-0">🔴 BREAKING</span>
            <span className="text-white/40 shrink-0">|</span>
            <div className="overflow-hidden flex-1 relative self-stretch">
              {/* Absolutely positioned so the animate-scroll marquee's
                  `left: 100% -> -100%` is measured against THIS
                  container's width, sweeping the whole bar from
                  off-screen right to off-screen left every pass,
                  regardless of how short or long the headlines are. */}
              <div className="animate-scroll whitespace-nowrap inline-flex items-center absolute top-1/2 -translate-y-1/2">
                {breakingArticles.map((article) => (
                  <span key={article.id} className="inline-flex items-center">
                    <Link href={`/${locale}/articles/${article.slug}`} className="text-white/90 hover:text-white transition-colors">
                      {article.title}
                    </Link>
                    <span className="mx-4 md:mx-6 text-white/30">•</span>
                  </span>
                ))}
              </div>
            </div>
            <span className="hidden sm:inline text-sm text-white/80 whitespace-nowrap shrink-0">
              {formattedDate}
            </span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-[#1a2a3a] border-b border-[#2a3a4a] shadow-lg">
        <div className="container">
          <div className="flex h-16 md:h-20 items-center justify-between gap-4">
            {/* Logo with Custom Image - plain <a>, not next/link's <Link>.
                The home page is a force-dynamic Server Component (real
                "Dernières actualités"/"À la une"/"Tendances" data), and a
                soft <Link> navigation back to it was still serving a
                stale client Router Cache snapshot - the same staleness
                bug the category links below were fixed for, and the
                next.config.js staleTimes:0 setting alone didn't prevent
                it in practice. Plain <a> forces a real navigation instead
                of reusing anything cached. */}
            <a href={`/${locale}`} className="flex items-center gap-2 md:gap-3 shrink-0">
              <div className="relative h-9 w-9 md:h-12 md:w-12 flex-shrink-0">
                {/* priority: this logo sits in the sticky header, visible
                    on every page load above the fold - it's effectively
                    always part of LCP, so it skips next/image's default
                    lazy-loading instead of racing the browser's viewport
                    check on first paint. */}
                <Image
                  src="/logo.png"
                  alt="Les Pages Libres"
                  fill
                  sizes="48px"
                  priority
                  className="object-contain"
                />
              </div>
              <div>
                <span className="text-lg md:text-2xl font-bold block leading-tight text-white">
                  Les Pages Libres
                </span>
                <span className="text-[10px] md:text-xs text-white/60 hidden sm:block">
                  Votre source d&apos;information
                </span>
              </div>
            </a>

            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center mx-4">
              {/* Same reasoning as the logo link above. */}
              <a
                href={`/${locale}`}
                className={`px-3 py-2 text-base font-medium transition-colors rounded-lg whitespace-nowrap ${
                  pathname === `/${locale}` || pathname === `/${locale}/`
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                Accueil
              </a>

              {categories.map((category) => {
                const hasSubcategories = category.subcategories && category.subcategories.length > 0;
                
                return (
                  <div
                    key={category.slug}
                    className="relative"
                    onMouseEnter={() => hasSubcategories && handleDropdownEnter(category.slug)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    {/*
                      Plain <a> instead of next/link's <Link> on purpose:
                      these category/subcategory pages come from data that
                      changes via the admin CRUD, and Next's client-side
                      Router Cache was reusing a stale "Category Not Found"
                      result on click (soft nav) even after the data was
                      confirmed correct server-side - a full refresh always
                      worked because it bypasses that cache entirely. A
                      plain anchor forces every click to do a real full
                      navigation, same as a refresh, sidestepping the cache
                      altogether.
                    */}
                    <a
                      href={`/${locale}/categories/${category.slug}`}
                      className={`px-3 py-2 text-base font-medium transition-colors rounded-lg whitespace-nowrap inline-flex items-center gap-1 ${
                        isCategoryActive(category.slug)
                          ? 'bg-white/20 text-white'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {category.label}
                      {hasSubcategories && <ChevronDown className="h-3 w-3" />}
                    </a>

                    {hasSubcategories && activeDropdown === category.slug && (
                      <div
                        className="absolute left-0 top-full mt-1 min-w-[200px] bg-[#1a2a3a] rounded-xl border border-[#2a3a4a] shadow-xl py-2 animate-fade-in"
                        onMouseEnter={() => handleDropdownEnter(category.slug)}
                        onMouseLeave={handleDropdownLeave}
                      >
                        {category.subcategories?.map((sub) => (
                          <a
                            key={sub.slug}
                            href={`/${locale}/categories/${category.slug}/${sub.slug}`}
                            className="block px-4 py-2 text-base text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                            onClick={() => setActiveDropdown(null)}
                          >
                            {sub.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              <SearchBar />
              <div className="hidden md:flex items-center gap-1">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 md:h-11 md:w-11 text-white hover:bg-white/10"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5 md:h-6 md:w-6" /> : <Menu className="h-5 w-5 md:h-6 md:w-6" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {tickerAds.length > 0 && (
        <div className="sticky top-[64px] md:top-[80px] z-40 bg-[#05286A] text-white border-b border-[#1a3a7a] shadow-md">
          <div className="container flex h-9 md:h-10 items-center gap-3">
            <span className="font-bold text-white/80 text-[10px] md:text-xs uppercase tracking-wider flex-shrink-0">
              📢 Annonce
            </span>
            <span className="text-white/30">|</span>
            <div className="overflow-hidden flex-1 relative self-stretch">
              {/* Same off-screen-right-to-off-screen-left sweep as the
                  breaking-news ticker above - see the "scroll" keyframe
                  comment in tailwind.config.js for why this replaced the
                  old doubled-content translateX(-50%) trick.
                  animationDuration is overridden inline (rather than via a
                  second Tailwind animation utility) so this ticker alone
                  runs slower than the breaking-news bar's default 14s,
                  without needing a second .animate-scroll-* class to also
                  carry the hover-pause/reduced-motion rules defined for
                  .animate-scroll in globals.css. */}
              <div
                className="animate-scroll whitespace-nowrap inline-flex items-center absolute top-1/2 -translate-y-1/2"
                style={{ animationDuration: '28s' }}
              >
                {tickerAds.map((ad) => {
                  const content = ad.textContent || ad.title;
                  return (
                    <span key={ad.id} className="text-xs md:text-sm text-white/90 mx-4 md:mx-6">
                      {ad.linkUrl ? (
                        <a
                          href={ad.linkUrl}
                          target="_blank"
                          rel="noopener sponsored noreferrer"
                          onClick={() => handleTickerClick(ad.id)}
                          className="hover:underline"
                        >
                          {content}
                        </a>
                      ) : (
                        content
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
            <span className="text-[10px] md:text-xs text-white/60 bg-white/10 px-2 md:px-3 py-0.5 rounded-full flex-shrink-0">
              Sponsor
            </span>
          </div>
        </div>
      )}

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        locale={locale}
        categories={categories}
      />
    </>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { X, ChevronRight, ChevronDown, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Category } from '@/lib/config/categories';
import { SOCIAL_LINKS } from '@/lib/config/social-links';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
  categories: Category[];
}

export function MobileMenu({ isOpen, onClose, locale, categories }: MobileMenuProps) {
  const pathname = usePathname();
  const t = useTranslations('Header');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleCategory = (slug: string) => {
    setExpandedCategories(prev =>
      prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : [...prev, slug]
    );
  };

  const navItems = [
    { href: `/${locale}`, label: 'Accueil' },
    { href: `/${locale}/articles`, label: 'Archives' },
  ];

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-background shadow-2xl animate-slide-in-right">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b p-5">
            <span className="text-xl font-bold">Menu</span>
            <Button variant="ghost" size="icon" className="h-11 w-11" onClick={onClose}>
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <nav className="space-y-2">
              {/* Search entry point - the header's <SearchBar /> (inline
                  expand-to-search-box) isn't rendered inside this slide-out
                  panel, so without this there was no way to reach search
                  once the menu was open. Links straight to the search page
                  rather than reusing SearchBar's inline-expand UI, which
                  doesn't have room to expand inside this narrow panel. */}
              <a
                href={`/${locale}/search`}
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg px-5 py-4 text-base font-medium transition-colors hover:bg-muted"
              >
                <Search className="h-5 w-5 text-muted-foreground" />
                Rechercher
              </a>
              {navItems.map((item) => (
                // Plain <a>, not next/link's <Link> - both entries here
                // (Accueil, Tous les articles) point at force-dynamic pages
                // whose data was going stale on a soft <Link> navigation
                // (client Router Cache), same issue already fixed in
                // header.tsx/footer.tsx and for the category links below.
                <a
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between rounded-lg px-5 py-4 text-base font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  {item.label}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </a>
              ))}
            </nav>

            <Separator className="my-5" />

            <div className="space-y-3">
              <p className="px-4 text-xs font-medium uppercase text-muted-foreground tracking-wider">
                Catégories
              </p>
              {categories.map((category) => {
                const hasSubcategories = category.subcategories && category.subcategories.length > 0;
                const isExpanded = expandedCategories.includes(category.slug);

                return (
                  <div key={category.slug} className="space-y-1">
                    <button
                      onClick={() => hasSubcategories && toggleCategory(category.slug)}
                      className={`w-full flex items-center justify-between rounded-lg px-5 py-4 text-base font-medium transition-colors ${
                        pathname?.includes(`/categories/${category.slug}`)
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {/*
                        Plain <a> instead of next/link's <Link> on purpose -
                        see the matching comment in header.tsx. Next's
                        client-side Router Cache was reusing a stale
                        "Category Not Found" result on click even after the
                        data was confirmed correct; a plain anchor forces a
                        real full navigation every time, same as a refresh.
                      */}
                      <a
                        href={`/${locale}/categories/${category.slug}`}
                        onClick={(e) => {
                          if (hasSubcategories) e.preventDefault();
                          else onClose();
                        }}
                        className="flex-1 text-left"
                      >
                        {category.label}
                      </a>
                      {hasSubcategories && (
                        <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      )}
                    </button>

                    {hasSubcategories && isExpanded && (
                      <div className="ml-4 space-y-1 border-l-2 pl-3">
                        {category.subcategories?.map((sub) => (
                          <a
                            key={sub.slug}
                            href={`/${locale}/categories/${category.slug}/${sub.slug}`}
                            onClick={onClose}
                            className={`block rounded-lg px-5 py-3 text-base transition-colors ${
                              pathname?.includes(`/categories/${category.slug}/${sub.slug}`)
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-muted'
                            }`}
                          >
                            {sub.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Separator className="my-5" />

            <div className="space-y-3">
              <p className="px-4 text-xs font-medium uppercase text-muted-foreground tracking-wider">
                Suivez-nous
              </p>
              <div className="flex flex-wrap gap-3 px-4">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                    aria-label={social.name}
                    title={social.name}
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>

            <Separator className="my-5" />

            {/* LanguageSwitcher/ThemeToggle both hardcode white icon
                colors (text-white/80, text-white) since their only other
                home is the header's fixed dark-navy bar (bg-[#1a2a3a]) -
                on the theme-aware bg-muted/50 this used to sit on, that's
                white-on-near-white in light mode. Matching the same navy
                here (instead of touching the shared components, which
                would risk the header) keeps them legible without
                affecting where they're already correct. */}
            <div className="flex items-center justify-center rounded-xl bg-[#1a2a3a] p-5">
              <div className="flex items-center gap-5">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

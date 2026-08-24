import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { CategoriesProvider } from '@/components/providers/categories-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import { locales } from '@/i18n/config';
import { getCategoriesWithSubcategories } from '@/lib/services/category-service';
import { getBreakingArticles } from '@/lib/services/article-service';
import { getAdsByPlacement } from '@/lib/services/ad-service';

// Header renders on EVERY page under [locale] and used to be a 'use
// client' component that fetched its own nav categories, breaking-news
// articles and ticker ads via three separate useEffect calls AFTER the
// page had already hydrated in the browser - so every single page load
// started with an empty/loading header, then fired three more
// client-server round trips before it had anything real to show. This
// layout is already an async Server Component, so it fetches all three
// server-side, in parallel, and hands them to Header as initial data -
// the header now arrives fully populated in the very first HTML
// response, with zero extra client-side round trips.
//
// revalidate: 30 (was force-dynamic) - force-dynamic re-ran this layout's
// 4 fetches (messages + categories + breaking articles + ticker ads) on
// literally every single request site-wide, even a repeat visit to a page
// you'd just looked at seconds ago - that's a real, avoidable cost paid
// on every navigation, since this app links with plain <a> tags (full
// page reloads) rather than client-side <Link> transitions. revalidate:
// 30 caches the rendered result for up to 30 seconds and serves that
// cached copy instantly to everyone else in the meantime, refreshing it
// in the background once it goes stale - a page you just visited loads
// instantly on a repeat visit within that window instead of re-querying
// the database again. A page/route below this layout that still needs
// per-request freshness (or reads searchParams, which forces this
// regardless) is unaffected - Next.js only caches a route when nothing in
// its tree opts out of it. Trade-off: an admin's edit can take up to ~30
// seconds to appear on a cached public page instead of being instant -
// standard practice for a site like this, and a world apart from the
// "never updates until a server restart" bugs fixed earlier in this
// session, which had nothing to do with this kind of bounded, short-lived
// cache.
export const revalidate = 30;

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: LocaleLayoutProps) {
  // Validate locale
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // getMessages() (i18n strings, read from a local bundled file - no DB
  // involved) doesn't depend on the three DB-backed fetches below, or vice
  // versa, so running all four together shaves off whatever getMessages()
  // costs from this layout's total latency instead of paying for it before
  // even starting the DB calls.
  const [messages, categories, breakingArticles, tickerAds] = await Promise.all([
    getMessages(),
    // false, false: active-only, and skip the article-count tally - the
    // nav dropdown only ever renders category/subcategory name + slug,
    // never a count, so there's no reason to pay for the full `articles`
    // table scan getCategoriesWithSubcategories() does when counts are
    // requested (see that function's own comment). Wrapped in React's
    // cache() (see category-service.ts) so a category/subcategory page's
    // own call to resolve itself reuses this same result instead of
    // re-querying.
    getCategoriesWithSubcategories(false, false),
    getBreakingArticles(6),
    getAdsByPlacement('ticker'),
  ]);

  // Only the fields Header actually renders - the full Article/Ad rows
  // carry a lot more (author/category joins, tracking fields, etc.) that
  // would otherwise get serialized into the page's RSC payload for no
  // reason.
  const navCategories = categories.map((c) => ({
    slug: c.slug,
    label: c.name,
    subcategories: (c.subcategories || []).map((s) => ({ slug: s.slug, label: s.name })),
  }));
  const navBreakingArticles = breakingArticles.map((a: any) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
  }));
  const navTickerAds = tickerAds.map((ad: any) => ({
    id: ad.id,
    title: ad.title,
    textContent: ad.textContent,
    linkUrl: ad.linkUrl,
  }));

  // <html> and <body> live in the root layout (src/app/layout.tsx) only.
  // Next.js requires exactly one root layout to own those tags — rendering
  // them here too produced invalid nested <html>/<body> markup and caused
  // hydration errors on every page load.
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <ThemeProvider>
        {/* Same navCategories the Header above was just given - shared
            via context so every Sidebar rendered anywhere under this
            layout (home page, category/subcategory pages, author pages,
            weather page) reads it directly instead of re-fetching it
            client-side (see categories-provider.tsx's own comment). */}
        <CategoriesProvider categories={navCategories}>
          <div className="relative flex min-h-screen flex-col">
            <Header
              initialCategories={navCategories}
              initialBreakingArticles={navBreakingArticles}
              initialTickerAds={navTickerAds}
            />
            <main className="flex-1">{children}</main>
            <Footer locale={locale} />
          </div>
          <Toaster />
        </CategoriesProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}

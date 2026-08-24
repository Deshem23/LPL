'use client';

import { createContext, useContext } from 'react';

export interface SidebarCategory {
  slug: string;
  label: string;
  subcategories: { slug: string; label: string }[];
}

// Every page under [locale] renders inside the layout, which already
// fetches this exact {slug, label, subcategories} shape server-side once
// per request for the Header nav (see [locale]/layout.tsx). Sidebar
// (rendered on the home page, every category/subcategory page, author
// pages, the weather page - anywhere with a "Catégories" widget) used to
// re-fetch the SAME data itself, client-side, via its own useEffect
// hitting /api/categories on every mount: a second full round trip AFTER
// the page had already rendered (part of why category clicks showed a
// loading state and then kept "settling" for a bit), and - since that
// route defaults to including article counts - a second full unbounded
// `articles` table scan on every single page view that includes a
// Sidebar, on top of the one the page itself already paid for. This
// context lets Sidebar just read what the layout already fetched instead
// of asking for it again.
const CategoriesContext = createContext<SidebarCategory[]>([]);

export function CategoriesProvider({
  categories,
  children,
}: {
  categories: SidebarCategory[];
  children: React.ReactNode;
}) {
  return (
    <CategoriesContext.Provider value={categories}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories(): SidebarCategory[] {
  return useContext(CategoriesContext);
}

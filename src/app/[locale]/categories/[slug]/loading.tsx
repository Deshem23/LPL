// This is the Suspense fallback Next.js shows for every route nested
// under /categories/[slug] (including /categories/[slug]/[subslug], which
// has no loading.tsx of its own) while the page's server data is being
// fetched. It used to render an animated skeleton (pulsing placeholder
// bars) - visible as a "loading animation" flash on every category and
// subcategory click, right before the real content popped in. Rendering
// nothing here means the browser just waits for the full page instead of
// showing that intermediate state - no flash, no skeleton.
export default function CategoryLoading() {
  return null;
}

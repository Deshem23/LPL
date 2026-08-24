// Root-level Suspense fallback (Next.js "loading.tsx" convention). This
// used to render an animated "Les Pages Libres / Chargement en cours…"
// splash screen. Because this app navigates with plain <a> links (full
// page reloads, not client-side <Link> transitions - see the comments in
// header.tsx/sidebar.tsx for why) and [locale]/layout.tsx fetches its nav
// data with a blocking await, this was the fallback Next.js reached for on
// EVERY full-page navigation site-wide whenever no more specific
// loading.tsx existed closer to the page being rendered - not just a rare
// "genuinely slow request" case. Rendering nothing here means a
// navigation just waits for the real page instead of flashing this
// animation first.
export default function RootLoading() {
  return null;
}

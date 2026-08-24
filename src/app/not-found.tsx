import Link from 'next/link';

// Root-level 404 fallback. Required alongside a custom `src/app/page.tsx`:
// without a not-found.tsx directly in `src/app/`, Next.js has nowhere to
// render a 404 that bubbles up above the `[locale]` segment, and instead
// throws "notFound() is not allowed to use in root layout". This component
// intentionally stays locale-agnostic (plain English) since it can render
// before any locale has been resolved.
export default function RootNotFound() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-4xl font-bold">Page Not Found</h1>
      <p className="mt-4 text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
      >
        Return Home
      </Link>
    </div>
  );
}

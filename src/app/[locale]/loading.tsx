import { Skeleton } from '@/components/ui/skeleton';

// Automatically wraps this route segment in a Suspense boundary — Next.js
// shows this skeleton while the async HomePage Server Component (and its
// data fetch) is in flight, then swaps in the real content once ready.
export default function HomeLoading() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-12">
      <Skeleton className="h-14 w-full rounded-xl" />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-[520px] w-full rounded-2xl lg:col-span-2" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </section>

      <section>
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-lg" />
          ))}
        </div>
      </section>

      <section>
        <Skeleton className="mb-6 h-8 w-40" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="mb-2 h-8 w-56" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="mb-2 h-8 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </section>

      <Skeleton className="h-56 w-full rounded-2xl" />
    </div>
  );
}

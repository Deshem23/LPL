import { Skeleton } from '@/components/ui/skeleton';

export default function ArticlesLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="mt-2 h-6 w-64" />
      </div>
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-4 sm:flex-row">
            <Skeleton className="h-48 w-full sm:h-auto sm:w-64" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Suspense } from 'react';
import { StatsCards } from '@/components/admin/dashboard/stats-cards';
import { RecentActivity } from '@/components/admin/dashboard/recent-activity';
import { ContentCalendar } from '@/components/admin/dashboard/content-calendar';
import { QuickActions } from '@/components/admin/dashboard/quick-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth/actions';

export const metadata = {
  title: 'Tableau de bord - Les Pages Libres',
};

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">Bon retour, {displayName} ! Voici ce qui se passe sur votre contenu.</p>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<ActivitySkeleton />}>
            <RecentActivity />
          </Suspense>
        </div>
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Calendar */}
      <Suspense fallback={<CalendarSkeleton />}>
        <ContentCalendar />
      </Suspense>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </CardContent>
    </Card>
  );
}

function CalendarSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

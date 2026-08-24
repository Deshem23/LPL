'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, Eye, TrendingUp, Calendar, Clock, Image, Tag, Circle, AlertCircle, CheckCircle } from 'lucide-react';

interface StatsData {
  totalArticles: number;
  published: number;
  draft: number;
  review: number;
  scheduled: number;
  archived: number;
  totalUsers: number;
  totalViews: number;
  totalCategories: number;
  totalMedia: number;
}

export function StatsCards() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // no-store + a cache-busting query param: belt-and-suspenders
        // against any browser-level caching of this GET on top of the
        // server-side no-store headers already set in the route (see
        // api/admin/stats/route.ts) - the stat cards should always
        // reflect the current DB state, never a stale snapshot.
        const response = await fetch(`/api/admin/stats?t=${Date.now()}`, { cache: 'no-store' });
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setStats({
          totalArticles: 0,
          published: 0,
          draft: 0,
          review: 0,
          scheduled: 0,
          archived: 0,
          totalUsers: 0,
          totalViews: 0,
          totalCategories: 0,
          totalMedia: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-3 w-24 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center text-muted-foreground">Aucune statistique disponible</div>;
  }

  const cards = [
    {
      title: 'Total des articles',
      value: stats.totalArticles,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      title: 'Publiés',
      value: stats.published,
      icon: CheckCircle,
      color: 'bg-green-500',
    },
    {
      title: 'Programmés',
      value: stats.scheduled,
      icon: Calendar,
      color: 'bg-blue-500',
    },
    {
      title: 'En relecture',
      value: stats.review,
      icon: AlertCircle,
      color: 'bg-yellow-500',
    },
    {
      title: 'Brouillons',
      value: stats.draft,
      icon: Circle,
      color: 'bg-gray-500',
    },
    {
      title: 'Utilisateurs',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      title: 'Vues totales',
      value: stats.totalViews.toLocaleString(),
      icon: Eye,
      color: 'bg-orange-500',
    },
    {
      title: 'Catégories',
      value: stats.totalCategories,
      icon: Tag,
      color: 'bg-teal-500',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`rounded-full p-2 ${card.color} bg-opacity-10`}>
                <Icon className={`h-4 w-4 ${card.color.replace('bg-', 'text-')}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

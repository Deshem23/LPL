'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Eye, FileText, Users, Activity, Archive, PenLine, Clock, FolderOpen, Image as ImageIcon, Trash2 } from 'lucide-react';

interface TimeSeriesPoint {
  label: string;
  articles: number;
  views: number;
}

interface CategoryBreakdown {
  id: string;
  name: string;
  articleCount: number;
  views: number;
  color: string;
}

interface TopArticle {
  id: string;
  title: string;
  slug: string;
  views: number;
  categoryName?: string | null;
  publishedAt?: string | null;
}

interface AnalyticsData {
  overview: {
    totalViews: number;
    publishedArticles: number;
    totalArticles: number;
    totalAuthors: number;
    avgViewsPerArticle: number;
    draftArticles: number;
    reviewArticles: number;
    scheduledArticles: number;
    archivedArticles: number;
    totalCategories: number;
    totalMedia: number;
    trash: {
      articles: number;
      media: number;
      users: number;
      total: number;
    };
  };
  timeSeries: TimeSeriesPoint[];
  categoryBreakdown: CategoryBreakdown[];
  topArticles: TopArticle[];
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly'>('weekly');
  const [data, setData] = useState<AnalyticsData | null>(null);

  const loadAnalytics = useCallback(async (range: 'weekly' | 'monthly') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics(timeRange);
  }, [timeRange, loadAnalytics]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-[400px] md:col-span-2" />
          <Skeleton className="h-[400px]" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const { overview, timeSeries, categoryBreakdown, topArticles } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytiques</h2>
          <p className="text-muted-foreground">
            Suivez les performances de votre contenu et de votre audience.
          </p>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as 'weekly' | 'monthly')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">7 derniers jours</SelectItem>
            <SelectItem value="monthly">6 derniers mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Vues totales"
          value={overview.totalViews.toLocaleString('fr-FR')}
          subtitle="cumulées, tous articles"
          icon={<Eye className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Articles publiés"
          value={overview.publishedArticles.toLocaleString('fr-FR')}
          subtitle={`sur ${overview.totalArticles.toLocaleString('fr-FR')} au total`}
          icon={<FileText className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Auteurs"
          value={overview.totalAuthors.toLocaleString('fr-FR')}
          subtitle="comptes utilisateurs"
          icon={<Users className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Vues moyennes / article"
          value={overview.avgViewsPerArticle.toLocaleString('fr-FR')}
          subtitle="parmi les articles publiés"
          icon={<Activity className="h-4 w-4 text-primary" />}
        />
      </div>

      {/* Content pipeline - what's NOT published yet, which the top row
          above never showed at all (it only ever contrasted "published"
          against "total"). Archivés and the recycle bin both used to be
          invisible from this page even though the data already existed
          elsewhere in the admin (article status filter, /admin/trash). */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Brouillons"
          value={overview.draftArticles.toLocaleString('fr-FR')}
          subtitle="non soumis"
          icon={<PenLine className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="En révision"
          value={overview.reviewArticles.toLocaleString('fr-FR')}
          subtitle="en attente de validation"
          icon={<Clock className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Programmés"
          value={overview.scheduledArticles.toLocaleString('fr-FR')}
          subtitle="publication à venir"
          icon={<Clock className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Archivés"
          value={overview.archivedArticles.toLocaleString('fr-FR')}
          subtitle="retirés de la publication"
          icon={<Archive className="h-4 w-4 text-primary" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Corbeille</CardTitle>
            <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.trash.total.toLocaleString('fr-FR')}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px]">{overview.trash.articles} article{overview.trash.articles !== 1 ? 's' : ''}</Badge>
              <Badge variant="outline" className="text-[10px]">{overview.trash.media} média{overview.trash.media !== 1 ? 's' : ''}</Badge>
              <Badge variant="outline" className="text-[10px]">{overview.trash.users} utilisateur{overview.trash.users !== 1 ? 's' : ''}</Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">en attente de suppression définitive (30 jours)</p>
          </CardContent>
        </Card>
        <StatCard
          title="Catégories"
          value={overview.totalCategories.toLocaleString('fr-FR')}
          subtitle="sections principales"
          icon={<FolderOpen className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Médias"
          value={overview.totalMedia.toLocaleString('fr-FR')}
          subtitle="fichiers dans la bibliothèque"
          icon={<ImageIcon className="h-4 w-4 text-primary" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Vues des articles publiés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="views"
                    name="Vues"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Articles par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground text-center px-4">
                Aucun article n&apos;est encore assigné à une catégorie.
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="articleCount"
                      nameKey="name"
                    >
                      {categoryBreakdown.map((entry) => (
                        <Cell key={entry.id} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Articles publiés dans le temps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="articles" name="Articles" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top articles</CardTitle>
        </CardHeader>
        <CardContent>
          {topArticles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun article pour le moment.</p>
          ) : (
            <div className="space-y-4">
              {topArticles.map((article, index) => (
                <div
                  key={article.id}
                  className="flex items-center gap-4 border-b pb-3 last:border-0"
                >
                  <span className="text-sm font-bold text-muted-foreground w-6">
                    #{index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{article.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {article.views.toLocaleString('fr-FR')}
                      </span>
                      {article.categoryName && (
                        <>
                          <span>•</span>
                          <span>{article.categoryName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

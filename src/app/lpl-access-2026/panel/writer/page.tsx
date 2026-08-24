'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientDate } from '@/components/shared/client-date';
import {
  FileText,
  Clock,
  CheckCircle,
  Plus,
  Edit,
  Eye,
  TrendingUp,
  Image,
  BarChart3,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface WriterDashboardData {
  stats: {
    total: number;
    draft: number;
    review: number;
    scheduled: number;
    published: number;
    archived: number;
    totalViews: number;
    publishedThisMonth: number;
  };
  recentArticles: Array<{ id: string; title: string; slug: string; status: string; views: number; date: string }>;
}

export default function WriterDashboard() {
  const [data, setData] = useState<WriterDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/my-dashboard', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((error) => console.error('Error loading writer dashboard:', error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { stats, recentArticles } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tableau de bord rédacteur</h2>
          <p className="text-muted-foreground">
            Gérez vos articles, vos médias et suivez vos performances.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            Rédacteur
          </Badge>
          <span className="text-sm text-muted-foreground">
            Dernière mise à jour : <ClientDate />
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total des articles" value={stats.total} icon={FileText} />
        <StatCard title="En révision" value={stats.review} icon={Clock} highlight="warning" />
        <StatCard title="Publiés" value={stats.published} icon={CheckCircle} highlight="success" />
        <StatCard title="Vues totales" value={stats.totalViews} icon={Eye} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <QuickActionButton href="/lpl-access-2026/panel/articles/new" icon={Plus} label="Créer un article" description="Rédiger du nouveau contenu" color="primary" />
        <QuickActionButton href="/lpl-access-2026/panel/media" icon={Image} label="Téléverser des médias" description="Ajouter des images et vidéos" color="blue" />
        <QuickActionButton href="/lpl-access-2026/panel/analytics" icon={BarChart3} label="Voir les statistiques" description="Suivre vos performances" color="purple" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Ce mois-ci
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{stats.publishedThisMonth}</span>{' '}
            article{stats.publishedThisMonth !== 1 ? 's' : ''} publié{stats.publishedThisMonth !== 1 ? 's' : ''} ce mois-ci
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Articles récents</CardTitle>
          <Link href="/lpl-access-2026/panel/articles/new">
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Nouvel article
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentArticles.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Vous n&apos;avez encore rédigé aucun article.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Vues</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentArticles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">{article.title}</TableCell>
                    <TableCell>
                      <Badge variant={
                        article.status === 'published' ? 'default' :
                        article.status === 'review' ? 'secondary' :
                        'outline'
                      }>
                        {article.status === 'published' ? 'Publié' :
                         article.status === 'review' ? 'En révision' :
                         article.status === 'scheduled' ? 'Programmé' :
                         article.status === 'archived' ? 'Archivé' :
                         'Brouillon'}
                      </Badge>
                    </TableCell>
                    <TableCell>{article.views.toLocaleString()}</TableCell>
                    <TableCell>{new Date(article.date).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/lpl-access-2026/panel/articles/${article.id}`}>
                          <Button size="sm" variant="ghost" className="h-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        {article.status === 'published' && (
                          <Link href={`/fr/articles/${article.slug}`} target="_blank">
                            <Button size="sm" variant="ghost" className="h-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, highlight }: { title: string; value: number; icon: any; highlight?: 'warning' | 'success' }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`rounded-full p-2 ${
          highlight === 'warning' ? 'bg-yellow-50 text-yellow-600' :
          highlight === 'success' ? 'bg-green-50 text-green-600' :
          'bg-primary/10 text-primary'
        }`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

const QUICK_ACTION_COLORS: Record<string, string> = {
  primary: 'hover:bg-primary/10 hover:border-primary/20 hover:text-primary',
  blue: 'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600',
  purple: 'hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600',
  green: 'hover:bg-green-50 hover:border-green-200 hover:text-green-600',
};

function QuickActionButton({ href, icon: Icon, label, description, color }: { href: string; icon: any; label: string; description: string; color: string }) {
  return (
    <a href={href} className="block">
      <div className={`rounded-lg border p-4 text-center transition-all hover:shadow-md ${QUICK_ACTION_COLORS[color] || ''}`}>
        <Icon className="mx-auto h-6 w-6" />
        <p className="mt-1 text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </a>
  );
}

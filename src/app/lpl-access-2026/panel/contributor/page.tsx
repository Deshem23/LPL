'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, PlusCircle, Clock, CheckCircle, XCircle, Edit } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AuthorDashboardData {
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

export default function ContributorDashboard() {
  const [userName, setUserName] = useState('Utilisateur');
  const [data, setData] = useState<AuthorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setUserName(user.user_metadata?.name || 'Utilisateur');
        }
        const res = await fetch('/api/admin/my-dashboard', { cache: 'no-store' });
        if (res.ok) {
          setData(await res.json());
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const { stats, recentArticles } = data;
  // The articles table has no "rejected" status (only draft / review /
  // scheduled / published / archived - see migrations/01_create_tables.sql).
  // "archived" is the closest available stand-in for a submission that
  // didn't get published; there's no dedicated rejection workflow yet.
  const approved = stats.published + stats.scheduled;
  const rejected = stats.archived;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bienvenue, {userName} ! 👋</h1>
        <p className="text-muted-foreground">Soumettez et suivez vos propositions d&apos;articles.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total des soumissions
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En attente de relecture
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.review}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approuvées
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejetées
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Soumettre un nouvel article</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Créez une nouvelle proposition d&apos;article pour relecture.
            </p>
            <Button asChild className="w-full">
              <Link href="/lpl-access-2026/panel/articles/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Soumettre un article
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mes soumissions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {stats.total > 0
                ? `Vous avez soumis ${stats.total} article${stats.total !== 1 ? 's' : ''} jusqu'à présent.`
                : "Vous n'avez encore rien soumis."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Soumissions récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentArticles.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Rien n&apos;a encore été soumis.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Statut</TableHead>
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
                         article.status === 'archived' ? 'Rejeté' :
                         'Brouillon'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(article.date).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/lpl-access-2026/panel/articles/${article.id}`}>
                        <Button size="sm" variant="ghost" className="h-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
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

'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RotateCcw, Trash2, ImageIcon, FileText, UserIcon, Clock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface TrashItem {
  type: 'media' | 'article' | 'user';
  id: string;
  title: string;
  thumbnail: string | null;
  deletedAt: string;
  daysRemaining: number;
}

const TYPE_LABEL: Record<TrashItem['type'], string> = {
  media: 'Média',
  article: 'Article',
  user: 'Utilisateur',
};

const TYPE_ICON: Record<TrashItem['type'], React.ElementType> = {
  media: ImageIcon,
  article: FileText,
  user: UserIcon,
};

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | TrashItem['type']>('all');
  // Tracks which row currently has a restore/delete request in flight, so
  // its two buttons can be disabled without freezing the whole list.
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trash', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load trash');
      setItems(json.items || []);
    } catch (error) {
      console.error('Error fetching trash:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la corbeille.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestore = async (item: TrashItem) => {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/trash/${item.type}/${item.id}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Une erreur est survenue.');

      toast({ title: 'Restauré', description: `"${item.title}" a été restauré avec succès.` });
      setItems((prev) => prev.filter((i) => !(i.type === item.type && i.id === item.id)));
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible de restaurer cet élément.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handlePermanentDelete = async (item: TrashItem) => {
    if (
      !confirm(
        `Supprimer définitivement "${item.title}" ? Cette action est irréversible et ne peut pas être annulée.`
      )
    ) {
      return;
    }

    setBusyId(item.id);
    try {
      const res = await fetch(`/api/trash/${item.type}/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Une erreur est survenue.');

      toast({ title: 'Supprimé définitivement', description: `"${item.title}" a été supprimé.` });
      setItems((prev) => prev.filter((i) => !(i.type === item.type && i.id === item.id)));
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible de supprimer définitivement cet élément.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const filteredItems = filter === 'all' ? items : items.filter((i) => i.type === filter);
  const counts = {
    all: items.length,
    media: items.filter((i) => i.type === 'media').length,
    article: items.filter((i) => i.type === 'article').length,
    user: items.filter((i) => i.type === 'user').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Corbeille</h2>
        <p className="text-muted-foreground">
          Les éléments supprimés (médias, articles, utilisateurs) restent ici 30 jours avant
          d&apos;être définitivement effacés. Vous pouvez les restaurer à tout moment avant cette date.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Éléments supprimés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList>
                <TabsTrigger value="all">Tous ({counts.all})</TabsTrigger>
                <TabsTrigger value="media">Médias ({counts.media})</TabsTrigger>
                <TabsTrigger value="article">Articles ({counts.article})</TabsTrigger>
                <TabsTrigger value="user">Utilisateurs ({counts.user})</TabsTrigger>
              </TabsList>
            </Tabs>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Chargement...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                <Trash2 className="h-8 w-8" />
                <p className="text-sm">La corbeille est vide.</p>
              </div>
            ) : (
              <div className="divide-y rounded-lg border">
                {filteredItems.map((item) => {
                  const Icon = TYPE_ICON[item.type];
                  const isBusy = busyId === item.id;
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {item.thumbnail ? (
                            <Image
                              src={item.thumbnail}
                              alt={item.title}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{item.title}</p>
                            <Badge variant="secondary" className="shrink-0 text-[10px]">
                              {TYPE_LABEL[item.type]}
                            </Badge>
                          </div>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {item.daysRemaining > 0
                              ? `Supprimé définitivement dans ${item.daysRemaining} jour${item.daysRemaining !== 1 ? 's' : ''}`
                              : 'Sera supprimé définitivement sous peu'}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={isBusy}
                          onClick={() => handleRestore(item)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restaurer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={isBusy}
                          onClick={() => handlePermanentDelete(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

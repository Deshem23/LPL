'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RotateCcw, Trash2, ImageIcon, FileText, UserIcon, Clock, Loader2 } from 'lucide-react';
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
  // Keyed by "type-id" (not just id) - a media row and a user row could
  // otherwise collide on the same uuid, same reason the list itself uses
  // `${item.type}-${item.id}` as its React key above.
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

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

  const keyOf = (item: TrashItem) => `${item.type}-${item.id}`;

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const toggleSelectAll = (keysOnPage: string[]) => {
    const allSelected = keysOnPage.every((k) => selectedKeys.includes(k));
    setSelectedKeys((prev) =>
      allSelected ? prev.filter((k) => !keysOnPage.includes(k)) : [...new Set([...prev, ...keysOnPage])]
    );
  };

  const selectedItems = items.filter((i) => selectedKeys.includes(keyOf(i)));

  const handleBulkRestore = async () => {
    if (selectedItems.length === 0) return;
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        selectedItems.map((item) => fetch(`/api/trash/${item.type}/${item.id}`, { method: 'POST' }))
      );
      const failures = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
      const successCount = results.length - failures.length;

      if (successCount > 0) {
        toast({ title: 'Restauré', description: `${successCount} élément${successCount !== 1 ? 's' : ''} restauré${successCount !== 1 ? 's' : ''}.` });
      }
      if (failures.length > 0) {
        toast({
          title: failures.length === results.length ? 'Erreur' : 'Restauration partielle',
          description: `${failures.length} élément${failures.length !== 1 ? 's' : ''} n'${failures.length !== 1 ? 'ont' : 'a'} pas pu être restauré${failures.length !== 1 ? 's' : ''}.`,
          variant: 'destructive',
        });
      }

      setSelectedKeys([]);
      await fetchTrash();
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedItems.length === 0) return;
    if (
      !confirm(
        `Supprimer définitivement ${selectedItems.length} élément${selectedItems.length !== 1 ? 's' : ''} ? Cette action est irréversible et ne peut pas être annulée.`
      )
    ) {
      return;
    }

    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        selectedItems.map((item) => fetch(`/api/trash/${item.type}/${item.id}`, { method: 'DELETE' }))
      );
      const failures = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
      const successCount = results.length - failures.length;

      if (successCount > 0) {
        toast({
          title: 'Supprimé définitivement',
          description: `${successCount} élément${successCount !== 1 ? 's' : ''} supprimé${successCount !== 1 ? 's' : ''}.`,
        });
      }
      if (failures.length > 0) {
        toast({
          title: failures.length === results.length ? 'Erreur' : 'Suppression partielle',
          description: `${failures.length} élément${failures.length !== 1 ? 's' : ''} n'${failures.length !== 1 ? 'ont' : 'a'} pas pu être supprimé${failures.length !== 1 ? 's' : ''} (ex. votre propre compte utilisateur ne peut pas être inclus).`,
          variant: 'destructive',
        });
      }

      setSelectedKeys([]);
      await fetchTrash();
    } finally {
      setBulkBusy(false);
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Corbeille</h2>
          <p className="text-muted-foreground">
            Les éléments supprimés (médias, articles, utilisateurs) restent ici 30 jours avant
            d&apos;être définitivement effacés. Vous pouvez les restaurer à tout moment avant cette date.
          </p>
        </div>
        {selectedKeys.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={bulkBusy}
              onClick={handleBulkRestore}
            >
              {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Restaurer la sélection ({selectedKeys.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={bulkBusy}
              onClick={handleBulkPermanentDelete}
            >
              {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Supprimer la sélection ({selectedKeys.length})
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Éléments supprimés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Tabs value={filter} onValueChange={(v) => { setFilter(v as typeof filter); setSelectedKeys([]); }}>
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
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && filteredItems.every((i) => selectedKeys.includes(keyOf(i)))}
                    onChange={() => toggleSelectAll(filteredItems.map(keyOf))}
                    className="h-4 w-4 rounded border-input"
                  />
                  Tout sélectionner
                </label>
                <div className="divide-y rounded-lg border">
                {filteredItems.map((item) => {
                  const Icon = TYPE_ICON[item.type];
                  const isBusy = busyId === item.id;
                  const key = keyOf(item);
                  return (
                    <div
                      key={key}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedKeys.includes(key)}
                          onChange={() => toggleSelect(key)}
                          aria-label={`Sélectionner ${item.title}`}
                          className="h-4 w-4 flex-shrink-0 rounded border-input"
                        />
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
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

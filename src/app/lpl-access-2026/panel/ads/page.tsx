'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Plus, MoreVertical, Edit, Trash2, Play, Pause, TrendingUp, Type, Image as ImageIcon } from 'lucide-react';
import { AdForm } from '@/components/admin/ads/ad-form';
import { toast } from '@/components/ui/use-toast';
import type { Ad } from '@/lib/types/ad';

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | undefined>(undefined);

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    setLoading(true);
    try {
      // Go through the API route (server-side, service-role client)
      // instead of calling getAds() directly from this client component -
      // see lib/supabase/admin.ts for why.
      const response = await fetch('/api/ads', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      const result = await response.json();
      setAds(result.ads || []);
    } catch (error) {
      console.error('Error loading ads:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les publicités.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette publicité ?')) return;
    try {
      const response = await fetch(`/api/ads/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      toast({ title: 'Publicité supprimée' });
      loadAds();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la publicité.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const response = await fetch(`/api/ads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      setAds(ads.map((ad) => (ad.id === id ? { ...ad, status: newStatus as 'active' | 'inactive' } : ad)));
      toast({
        title: newStatus === 'active' ? 'Publicité activée' : 'Publicité désactivée',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la publicité.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Publicités</h2>
          <p className="text-muted-foreground">
            Gérez les publicités sur votre plateforme (image et texte).
          </p>
        </div>
        <Button onClick={() => { setEditingAd(undefined); setIsDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle publicité
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Toutes les publicités</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Publicité</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden md:table-cell">Vues</TableHead>
                <TableHead className="hidden md:table-cell">Clics</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucune publicité. Créez votre première publicité !
                  </TableCell>
                </TableRow>
              ) : (
                ads.map((ad) => (
                  <TableRow key={ad.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {ad.isTextOnly ? (
                          <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center">
                            <Type className="h-6 w-6 text-primary" />
                          </div>
                        ) : ad.imageUrl ? (
                          <div className="relative h-12 w-20 flex-shrink-0 overflow-hidden rounded">
                            <Image
                              src={ad.imageUrl}
                              alt={ad.title}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{ad.title}</p>
                          {ad.isTextOnly && (
                            <Badge variant="outline" className="text-xs">
                              Texte uniquement
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ad.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ad.placement}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ad.status === 'active' ? 'default' : 'secondary'}>
                        {ad.status === 'active' ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {ad.views.toLocaleString()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {ad.clicks.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingAd(ad);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(ad.id, ad.status)}>
                            {ad.status === 'active' ? (
                              <>
                                <Pause className="mr-2 h-4 w-4" />
                                Désactiver
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 h-4 w-4" />
                                Activer
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(ad.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAd ? 'Modifier la publicité' : 'Nouvelle publicité'}
            </DialogTitle>
          </DialogHeader>
          <AdForm
            ad={editingAd}
            locale="fr"
            onSuccess={() => {
              setIsDialogOpen(false);
              setEditingAd(undefined);
              loadAds();
            }}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingAd(undefined);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

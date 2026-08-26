'use client';

import { useState, useEffect, useCallback } from 'react';
import { MediaGrid } from '@/components/admin/media/media-grid';
import { MediaUploadDialog } from '@/components/admin/media/media-upload-dialog';
import { MediaFilter } from '@/components/admin/media/media-filter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ChevronLeft, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const PAGE_SIZE = 20;

// Maps a DB row (snake_case, as returned by /api/media) to the camelCase
// shape MediaGrid expects.
function mapMedia(row: any) {
  return {
    id: row.id,
    url: row.url,
    type: row.type,
    title: row.file_name || row.alt_text || 'Sans titre',
    altText: row.alt_text || '',
    caption: row.caption || '',
    size: row.file_size || 0,
    createdAt: row.created_at,
  };
}

export default function AdminMediaPage() {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: 'all', search: '' });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (filters.type !== 'all') qs.set('type', filters.type);
      if (filters.search) qs.set('search', filters.search);

      const res = await fetch(`/api/media?${qs.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load media');

      setMedia((json.media || []).map(mapMedia));
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch (error) {
      console.error('Error fetching media:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la médiathèque.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleFilter = (newFilters: { type: string; search: string }) => {
    setPage(1);
    setFilters(newFilters);
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = (idsOnPage: string[]) => {
    const allSelected = idsOnPage.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected ? prev.filter((id) => !idsOnPage.includes(id)) : [...new Set([...prev, ...idsOnPage])]
    );
  };

  // Same soft-delete-to-trash path as the single-item delete (DELETE
  // /api/media/[id] only stamps deleted_at - see that route), just
  // fired once per selected item.
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Supprimer ${selectedIds.length} fichier${selectedIds.length !== 1 ? 's' : ''} sélectionné${selectedIds.length !== 1 ? 's' : ''} ? Ils seront déplacés vers la corbeille.`
      )
    ) {
      return;
    }

    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => fetch(`/api/media/${id}`, { method: 'DELETE' }))
      );
      const failures = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
      const successCount = results.length - failures.length;

      if (successCount > 0) {
        toast({
          title: 'Fichiers supprimés',
          description: `${successCount} fichier${successCount !== 1 ? 's' : ''} déplacé${successCount !== 1 ? 's' : ''} vers la corbeille.`,
        });
      }
      if (failures.length > 0) {
        toast({
          title: failures.length === results.length ? 'Erreur' : 'Suppression partielle',
          description: `${failures.length} fichier${failures.length !== 1 ? 's' : ''} n'${failures.length !== 1 ? 'ont' : 'a'} pas pu être supprimé${failures.length !== 1 ? 's' : ''}.`,
          variant: 'destructive',
        });
      }

      setSelectedIds([]);
      await fetchMedia();
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce fichier ? Cette action est irréversible.')) return;

    try {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Une erreur est survenue.');

      toast({ title: 'Supprimé', description: 'Le fichier a été supprimé avec succès.' });
      fetchMedia();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible de supprimer ce fichier.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Médiathèque</h2>
          <p className="text-muted-foreground">
            Gérez vos images, vidéos et fichiers audio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="outline"
              className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={bulkDeleting}
              onClick={handleBulkDelete}
            >
              {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Supprimer la sélection ({selectedIds.length})
            </Button>
          )}
          <MediaUploadDialog onUploadComplete={() => fetchMedia()}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un média
            </Button>
          </MediaUploadDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tous les médias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <MediaFilter onFilter={handleFilter} initialType={filters.type} initialSearch={filters.search} />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {total} fichier{total !== 1 ? 's' : ''} trouvé{total !== 1 ? 's' : ''}
              </span>
              {media.length > 0 && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={media.every((m) => selectedIds.includes(m.id))}
                    onChange={() => toggleSelectAll(media.map((m) => m.id))}
                    className="h-4 w-4 rounded border-input"
                  />
                  Tout sélectionner sur cette page
                </label>
              )}
            </div>
            <MediaGrid
              media={media}
              loading={loading}
              onDelete={handleDelete}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} sur {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

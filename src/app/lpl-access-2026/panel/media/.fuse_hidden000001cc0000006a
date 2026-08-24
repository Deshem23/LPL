'use client';

import { useState, useEffect, useCallback } from 'react';
import { MediaGrid } from '@/components/admin/media/media-grid';
import { MediaUploadDialog } from '@/components/admin/media/media-upload-dialog';
import { MediaFilter } from '@/components/admin/media/media-filter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
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
        <MediaUploadDialog onUploadComplete={() => fetchMedia()}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un média
          </Button>
        </MediaUploadDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tous les médias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <MediaFilter onFilter={handleFilter} initialType={filters.type} initialSearch={filters.search} />
            <div className="text-sm text-muted-foreground">
              {total} fichier{total !== 1 ? 's' : ''} trouvé{total !== 1 ? 's' : ''}
            </div>
            <MediaGrid
              media={media}
              loading={loading}
              onDelete={handleDelete}
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

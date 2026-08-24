'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Loader2, UploadCloud, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface MediaItem {
  id: string;
  url: string;
  file_name?: string;
  alt_text?: string;
}

interface InsertImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (url: string) => void;
}

// Replaces the rich-text editor's old "Insérer une image" button, which
// just did window.prompt('Entrez l'URL de l'image') - useless unless the
// image was already hosted somewhere else. This gives two real ways to
// add one: drag-and-drop/browse a file straight from disk (uploads to
// the same /api/media/upload the admin media library already uses), or
// pick something already uploaded to the platform's media library
// (/api/media). Either way ends by calling onInsert(url), which the
// editor turns into an actual <img> node at the cursor.
export function InsertImageDialog({ open, onOpenChange, onInsert }: InsertImageDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [libraryItems, setLibraryItems] = useState<MediaItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoadingLibrary(true);
    const params = new URLSearchParams({ type: 'image', limit: '24' });
    if (search.trim()) params.set('search', search.trim());
    // Debounced so typing in the search box doesn't fire a request per
    // keystroke.
    const timer = setTimeout(() => {
      fetch(`/api/media?${params.toString()}`, { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          setLibraryItems(data.media || []);
        })
        .catch(() => {
          if (!cancelled) setLibraryItems([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoadingLibrary(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search]);

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Fichier invalide', description: 'Veuillez choisir une image.', variant: 'destructive' });
      return;
    }
    setIsUploading(true);
    try {
      const body = new FormData();
      body.append('files', file);
      body.append('type', 'image');
      const res = await fetch('/api/media/upload', { method: 'POST', body });
      const result = await res.json();
      if (!res.ok || !result.media?.[0]?.url) {
        throw new Error(result.error || "Échec du téléversement de l'image");
      }
      onInsert(result.media[0].url);
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Insérer une image</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Téléverser</TabsTrigger>
            <TabsTrigger value="library">Bibliothèque</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition-colors',
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              )}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Téléversement en cours...</p>
                </>
              ) : (
                <>
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Glissez-déposez une image ici</p>
                  <p className="text-xs text-muted-foreground">ou cliquez pour parcourir vos fichiers (JPG, PNG, WebP - max 5 Mo)</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file);
                  e.target.value = '';
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="library">
            <Input
              placeholder="Rechercher dans la bibliothèque..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-3"
            />
            {isLoadingLibrary ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : libraryItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <ImageOff className="h-8 w-8" />
                <p className="text-sm">Aucune image trouvée.</p>
              </div>
            ) : (
              <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                {libraryItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { onInsert(item.url); onOpenChange(false); }}
                    className="group relative aspect-square overflow-hidden rounded-lg border hover:ring-2 hover:ring-primary"
                    title={item.alt_text || item.file_name}
                  >
                    <Image
                      src={item.url}
                      alt={item.alt_text || ''}
                      fill
                      sizes="(min-width: 640px) 25vw, 33vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

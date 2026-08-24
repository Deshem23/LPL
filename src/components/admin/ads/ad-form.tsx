'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Upload, X, Type, Image as ImageIcon, Video, Plus } from 'lucide-react';
import { Ad, AdMediaItem } from '@/lib/types/ad';

interface AdFormProps {
  ad?: Ad;
  locale: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const genMediaId = () => `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function AdForm({ ad, locale, onSuccess, onCancel }: AdFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  // Multiple images/videos, each with its own title/description/link, so
  // the ad can carousel/fade between slides on its own - not just between
  // separate ads. Falls back to the legacy `images`/`imageUrl` fields
  // when editing an older ad saved before per-slide details existed.
  const [media, setMedia] = useState<AdMediaItem[]>(() => {
    if (ad?.media && ad.media.length > 0) return ad.media;
    const legacyImages = ad?.images && ad.images.length > 0 ? ad.images : ad?.imageUrl ? [ad.imageUrl] : [];
    return legacyImages.map((url) => ({ id: genMediaId(), type: 'image' as const, url }));
  });
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isTextOnly, setIsTextOnly] = useState(ad?.isTextOnly || false);

  const [formData, setFormData] = useState({
    title: ad?.title || '',
    description: ad?.description || '',
    linkUrl: ad?.linkUrl || '',
    type: ad?.type || 'banner',
    placement: ad?.placement || 'top',
    status: ad?.status || 'inactive',
    priority: ad?.priority || 0,
    startDate: ad?.startDate || '',
    endDate: ad?.endDate || '',
    textContent: ad?.textContent || '',
    sponsorName: ad?.sponsorName || '',
    buttonText: ad?.buttonText || '',
    backgroundColor: ad?.backgroundColor || '#f8f9fa',
    textColor: ad?.textColor || '#1a1a1a',
  });

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    // Allow re-selecting the same file again later (e.g. after removing it).
    e.target.value = '';

    setIsUploadingMedia(true);
    try {
      // Uploaded to Supabase Storage and referenced by a short URL, same
      // as every other image in the app (article covers, avatars, the
      // media library - see media-upload-dialog.tsx) - this used to read
      // each file as a base64 data: URI (FileReader.readAsDataURL) and
      // store that giant string directly in the ads.media/ads.images
      // columns. A single photo easily becomes 500KB-2MB once
      // base64-encoded, and getAdsByPlacement() selects every column for
      // every ad on every page that shows one (nearly every page, via
      // the sidebar/ticker) - that's exactly what was behind the "Failed
      // to set Next.js data cache, items over 2MB can not be cached"
      // errors and multi-hundred-ms ad fetches on every request. A
      // storage URL is a few dozen bytes instead.
      // type: 'image' - the media table's `type` CHECK constraint only
      // allows 'image' | 'video' | 'audio' | 'gallery' | 'podcast' |
      // 'avatar' (see migrations/15_allow_avatar_media_type.sql, added
      // after the exact same class of bug for avatar uploads); an ad
      // photo is still an image, so no new migration is needed here.
      const formData = new FormData();
      fileList.forEach((file) => formData.append('files', file));
      formData.append('type', 'image');

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Échec du téléversement');
      }

      setMedia((prev) => [
        ...prev,
        ...result.media.map((m: any) => ({ id: genMediaId(), type: 'image' as const, url: m.url })),
      ]);

      if (result.failures?.length) {
        toast({
          title: 'Certains fichiers ont échoué',
          description: result.failures.join(' | '),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error?.message || 'Échec du téléversement des images.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const addVideo = () => {
    const url = videoUrlInput.trim();
    if (!url) return;
    setMedia((prev) => [...prev, { id: genMediaId(), type: 'video', url }]);
    setVideoUrlInput('');
  };

  const removeMedia = (id: string) => {
    setMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const updateMediaField = (id: string, field: 'title' | 'description' | 'linkUrl', value: string) => {
    setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.title) {
      toast({
        title: 'Erreur',
        description: 'Le titre est requis.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (!formData.linkUrl) {
      toast({
        title: 'Erreur',
        description: 'L\'URL de destination est requise.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (isTextOnly && !formData.textContent) {
      toast({
        title: 'Erreur',
        description: 'Le contenu texte est requis pour une publicité textuelle.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (!isTextOnly && media.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Au moins une image ou vidéo est requise pour une publicité avec média.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      const imageMedia = media.filter((m) => m.type === 'image');
      const data = {
        ...formData,
        media,
        // Kept for backward compatibility with anything still reading
        // the older flat fields.
        images: imageMedia.map((m) => m.url),
        imageUrl: imageMedia[0]?.url || '',
        isTextOnly,
      };

      // Go through the API route (server-side, service-role client)
      // instead of calling createAd()/updateAd() directly from this
      // client component - see lib/supabase/admin.ts for why.
      const url = ad ? `/api/ads/${ad.id}` : '/api/ads';
      const method = ad ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Une erreur est survenue');
      }

      toast({
        title: ad ? 'Publicité mise à jour' : 'Publicité créée',
        description: ad
          ? 'La publicité a été mise à jour avec succès.'
          : 'La publicité a été créée avec succès.',
      });

      if (onSuccess) onSuccess();
    } catch (error: any) {
      // Surface the real reason (from the API route / DB) instead of a
      // generic message - this was previously hard-coded, so the actual
      // cause of a failed save was invisible even with the toast working.
      toast({
        title: 'Erreur',
        description: error?.message || 'Une erreur est survenue. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Informations de la publicité</CardTitle>
                  <CardDescription>
                    Configurez les détails de votre publicité.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-muted-foreground" />
                  <Switch
                    checked={isTextOnly}
                    onCheckedChange={(checked) => {
                      setIsTextOnly(checked);
                      if (checked) {
                        setMedia([]);
                      }
                    }}
                  />
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex : Conférence Tech 2024"
                  className="mt-1.5"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description de la publicité..."
                  rows={2}
                  className="mt-1.5 resize-none"
                />
              </div>

              {isTextOnly ? (
                <>
                  <div>
                    <Label htmlFor="textContent">Contenu texte *</Label>
                    <Textarea
                      id="textContent"
                      value={formData.textContent}
                      onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                      placeholder="Ex: 🌱 Découvrez des astuces pour un mode de vie plus durable..."
                      rows={3}
                      className="mt-1.5 resize-none"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Le texte qui sera affiché dans la publicité.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sponsorName">Nom du sponsor</Label>
                      <Input
                        id="sponsorName"
                        value={formData.sponsorName}
                        onChange={(e) => setFormData({ ...formData, sponsorName: e.target.value })}
                        placeholder="Ex: EcoLife"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="buttonText">Texte du bouton</Label>
                      <Input
                        id="buttonText"
                        value={formData.buttonText}
                        onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                        placeholder="Ex: En savoir plus"
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="backgroundColor">Couleur de fond</Label>
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          id="backgroundColor"
                          type="color"
                          value={formData.backgroundColor}
                          onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                          className="w-12 p-1 h-10"
                        />
                        <Input
                          value={formData.backgroundColor}
                          onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                          className="flex-1"
                          placeholder="#f8f9fa"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="textColor">Couleur du texte</Label>
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          id="textColor"
                          type="color"
                          value={formData.textColor}
                          onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                          className="w-12 p-1 h-10"
                        />
                        <Input
                          value={formData.textColor}
                          onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                          className="flex-1"
                          placeholder="#1a1a1a"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <Label>
                    Images / vidéos {media.length > 0 && `(${media.length})`}
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ajoutez plusieurs images ou vidéos pour qu&apos;elles
                    défilent en fondu automatiquement. Chacune peut avoir
                    son propre titre, description et lien - sinon le
                    titre et le lien général de la publicité (ci-dessous)
                    sont utilisés.
                  </p>

                  <div className="mt-2 space-y-2">
                    {media.map((item, index) => (
                      <div key={item.id} className="flex gap-3 rounded-lg border p-2.5">
                        <div className="relative h-16 w-16 flex-shrink-0">
                          {item.type === 'video' ? (
                            <video src={item.url} className="h-full w-full rounded-md object-cover bg-muted" muted />
                          ) : (
                            <Image src={item.url} alt="" fill sizes="64px" className="rounded-md object-cover" />
                          )}
                          <span className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#1a2a3a] text-white">
                            {item.type === 'video' ? (
                              <Video className="h-2.5 w-2.5" />
                            ) : (
                              <ImageIcon className="h-2.5 w-2.5" />
                            )}
                          </span>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <Input
                            value={item.title || ''}
                            onChange={(e) => updateMediaField(item.id, 'title', e.target.value)}
                            placeholder={`Titre du slide ${index + 1} (optionnel - sinon le titre général)`}
                            className="h-8 text-sm"
                          />
                          <Textarea
                            value={item.description || ''}
                            onChange={(e) => updateMediaField(item.id, 'description', e.target.value)}
                            placeholder="Description (optionnel)"
                            rows={1}
                            className="min-h-8 text-sm resize-none"
                          />
                          <Input
                            value={item.linkUrl || ''}
                            onChange={(e) => updateMediaField(item.id, 'linkUrl', e.target.value)}
                            placeholder="Lien de ce slide (optionnel - sinon le lien général)"
                            className="h-8 text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMedia(item.id)}
                          className="self-start p-1 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <label
                      htmlFor="image-upload"
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/30 transition-colors py-2.5 text-sm text-muted-foreground ${
                        isUploadingMedia ? 'cursor-wait opacity-60' : 'cursor-pointer hover:bg-muted/50'
                      }`}
                    >
                      <Upload className="h-4 w-4" />
                      {isUploadingMedia ? 'Téléversement...' : 'Ajouter des images'}
                      <input
                        id="image-upload"
                        type="file"
                        multiple
                        className="hidden"
                        accept="image/*"
                        disabled={isUploadingMedia}
                        onChange={handleImageUpload}
                      />
                    </label>
                    <div className="flex flex-1 gap-2">
                      <Input
                        value={videoUrlInput}
                        onChange={(e) => setVideoUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addVideo();
                          }
                        }}
                        placeholder="URL d'une vidéo (.mp4, ...)"
                        className="text-sm"
                      />
                      <Button type="button" variant="outline" onClick={addVideo}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="linkUrl">URL de destination générale *</Label>
                <Input
                  id="linkUrl"
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="https://example.com"
                  className="mt-1.5"
                  required
                />
                {!isTextOnly && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Utilisé quand un slide ci-dessus n&apos;a pas son propre lien.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* "Popup" removed - it implied intrusive popup
                        behavior that isn't implemented and would be
                        disruptive, so it's no longer offered here. */}
                    <SelectItem value="banner">Bannière</SelectItem>
                    <SelectItem value="sidebar">Sidebar</SelectItem>
                    <SelectItem value="in-article">In-Article</SelectItem>
                    <SelectItem value="video">Vidéo</SelectItem>
                    <SelectItem value="text">Texte</SelectItem>
                    <SelectItem value="sponsored">Sponsorisé</SelectItem>
                    <SelectItem value="link">Lien</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="placement">Placement</Label>
                <Select
                  value={formData.placement}
                  onValueChange={(value: any) => setFormData({ ...formData, placement: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Sélectionner un placement" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Only placements an actual component on the site
                        requests are listed here - "Top"/"Milieu"/"Bas"/
                        "Footer" used to be selectable but had no matching
                        ad slot anywhere, so an ad assigned to them was
                        silently invisible. Add a slot for one of those
                        first (see AdComponent usages) before re-adding it
                        here. */}
                    <SelectItem value="sidebar">Sidebar</SelectItem>
                    <SelectItem value="in-article">In-Article</SelectItem>
                    <SelectItem value="ticker">Bandeau (Annonce)</SelectItem>
                  </SelectContent>
                </Select>
                {formData.placement === 'ticker' && !isTextOnly && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    Le bandeau Annonce n&apos;affiche que du texte - activez
                    « Texte uniquement » ci-dessus, sinon cette publicité
                    n&apos;apparaîtra pas.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                    <SelectItem value="scheduled">Programmé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.status === 'scheduled') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Date de début</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Date de fin</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Enregistrement...' : ad ? 'Mettre à jour' : 'Créer'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Annuler
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

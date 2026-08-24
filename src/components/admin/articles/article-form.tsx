'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useToast } from '@/components/ui/use-toast';
import { X, Plus, Sparkles, TrendingUp, Pin, Loader2 } from 'lucide-react';
import { FaFire } from 'react-icons/fa';
import { getCurrentUserWithRole } from '@/lib/auth/actions';

interface ArticleFormProps {
  article?: any;
  locale: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// <input type="datetime-local"> only accepts/displays the exact
// "YYYY-MM-DDTHH:mm" shape, in the browser's LOCAL time - not a full ISO
// timestamp with seconds/timezone like Supabase returns (e.g.
// "2026-08-25T14:30:00+00:00"). Without this conversion the input just
// silently renders blank even though scheduledPublishAt has a real value
// - which is why an existing scheduled article never showed its time.
function isoToDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// The reverse, for submit: a bare "YYYY-MM-DDTHH:mm" string (no timezone)
// is ambiguous - Postgres would otherwise store it as if it were UTC,
// which silently shifts a scheduled time by the admin's UTC offset (e.g.
// 2:30 PM chosen locally gets stored/published as 2:30 PM UTC instead).
// `new Date(...)` on a timezone-less datetime string parses it as LOCAL
// time per spec, so converting through it and back to ISO gives the
// correct UTC instant to store.
function datetimeLocalToIso(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function ArticleForm({ article, onSuccess, onCancel }: ArticleFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authors, setAuthors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [availableSubcategories, setAvailableSubcategories] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>(article?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [showNewSubcategoryInput, setShowNewSubcategoryInput] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Writers and contributors could previously reassign an article to any
  // other author, and flip on "À la une" / "Tendance" / "Suggestion" /
  // "Breaking News" - all editorial decisions meant for admins/editors
  // deciding what the whole site highlights, not something every
  // contributor submitting a piece should control. Both sections below
  // are hidden (not just disabled) for those two roles - the underlying
  // form values are untouched either way, so editing an already-flagged
  // article as a writer/contributor doesn't silently clear its flags.
  // DB-authoritative role (public.users via getCurrentUserWithRole()),
  // not the session JWT's user_metadata.role - the JWT claim only
  // refreshes on a full login, so a writer/contributor just promoted to
  // editor/admin without re-logging in would otherwise still have these
  // sections hidden here even though the server-side checks in
  // /api/articles (see that route's comment) would now allow them.
  const [currentRole, setCurrentRole] = useState('contributor');
  const canAssignAuthor = currentRole === 'admin' || currentRole === 'editor';
  const canAssignEditorialFlags = currentRole === 'admin' || currentRole === 'editor';

  const [formData, setFormData] = useState({
    title: article?.title || '',
    excerpt: article?.excerpt || '',
    content: article?.content || '',
    status: article?.status || 'draft',
    author_id: article?.author_id || '',
    category_id: article?.category_id || '',
    subcategory_id: article?.subcategory_id || '',
    isBreaking: article?.isBreaking || false,
    isFeatured: article?.isFeatured || false,
    isSuggestion: article?.isSuggestion || false,
    isTrending: article?.isTrending || false,
    isPinned: article?.isPinned || false,
    scheduledPublishAt: isoToDatetimeLocal(article?.scheduledPublishAt),
    // Lets an article be backdated - e.g. importing older content, or
    // matching the date it was actually first published elsewhere -
    // instead of always being stamped with the moment it's saved.
    // Defaults to "now" (same as the old, non-configurable behavior) so
    // it only changes anything when someone actually edits it.
    publishDate: isoToDatetimeLocal(article?.created_at || new Date().toISOString()),
    coverImage: article?.coverImage || '',
    meta_description: article?.meta_description || '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const auth = await getCurrentUserWithRole();
        const user = auth?.user ?? null;
        setCurrentUser(user);
        setCurrentRole(auth?.role || 'contributor');
        if (!formData.author_id && user) {
          setFormData(prev => ({ ...prev, author_id: user.id }));
        }
        // Go through the API routes (server-side, service-role client)
        // instead of calling getAllUsers()/getCategoriesWithSubcategories()
        // directly from this client component — see admin.ts for why.
        const usersRes = await fetch('/api/users', { cache: 'no-store' });
        const usersJson = await usersRes.json();
        const users = usersRes.ok ? (usersJson.users || []) : [];
        setAuthors(users);
        const catsRes = await fetch('/api/categories', { cache: 'no-store' });
        const catsJson = await catsRes.json();
        const cats = catsRes.ok ? (catsJson.categories || []) : [];
        setCategories(cats);
        // The DB only has one category_id column on articles - it can
        // point at either a top-level category OR a subcategory row.
        // Figure out which, so the two dropdowns (category / subcategory)
        // reflect the article's real assignment instead of always
        // treating category_id as top-level.
        if (article?.category_id) {
          const topLevelMatch = cats.find((c: any) => c.id === article.category_id);
          if (topLevelMatch) {
            setAvailableSubcategories(topLevelMatch.subcategories || []);
          } else {
            const parent = cats.find((c: any) =>
              (c.subcategories || []).some((s: any) => s.id === article.category_id)
            );
            if (parent) {
              setAvailableSubcategories(parent.subcategories || []);
              setFormData(prev => ({
                ...prev,
                category_id: parent.id,
                subcategory_id: article.category_id,
              }));
            }
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  const handleCategoryChange = (categoryId: string) => {
    setFormData({ ...formData, category_id: categoryId, subcategory_id: '' });
    const category = categories.find(c => c.id === categoryId);
    setAvailableSubcategories(category?.subcategories || []);
    setShowNewSubcategoryInput(false);
    setNewSubcategoryName('');
  };

  const handleCreateSubcategory = async () => {
    if (!newSubcategoryName.trim() || !formData.category_id) return;
    setIsCreatingSubcategory(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubcategoryName.trim(), parent_id: formData.category_id }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Impossible de créer la sous-catégorie.');
      }

      // Re-fetch categories so `categories` state stays in sync with the
      // database, then re-derive the subcategory list for the currently
      // selected category and auto-select the one just created.
      const catsRes = await fetch('/api/categories');
      const catsJson = await catsRes.json();
      const cats = catsRes.ok ? (catsJson.categories || []) : categories;
      setCategories(cats);
      const parent = cats.find((c: any) => c.id === formData.category_id);
      setAvailableSubcategories(parent?.subcategories || []);
      setFormData(prev => ({ ...prev, subcategory_id: result.category.id }));
      setNewSubcategoryName('');
      setShowNewSubcategoryInput(false);
      toast({ title: 'Sous-catégorie créée', description: `"${result.category.name}" a été ajoutée.` });
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreatingSubcategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.title || !formData.content) {
      toast({ title: 'Erreur', description: 'Titre et contenu obligatoires.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    try {
      // The articles table only has category_id - it can point directly
      // at a subcategory row (subcategories are just categories with a
      // parent_id). If a subcategory is selected, that's the id we save;
      // otherwise we save the top-level category's id.
      const finalCategoryId = formData.subcategory_id || formData.category_id;

      const articleData = {
        title: formData.title,
        excerpt: formData.excerpt,
        content: formData.content,
        status: formData.status,
        author_id: formData.author_id || currentUser?.id,
        category_id: finalCategoryId || undefined,
        is_breaking: formData.isBreaking,
        is_featured: formData.isFeatured,
        is_suggestion: formData.isSuggestion,
        is_trending: formData.isTrending,
        is_pinned: formData.isPinned,
        scheduled_publish_at: datetimeLocalToIso(formData.scheduledPublishAt),
        created_at: datetimeLocalToIso(formData.publishDate),
        featured_image: formData.coverImage || undefined,
        meta_description: formData.meta_description,
        tags: tags.length > 0 ? tags : undefined,
      };

      const url = article?.id ? `/api/articles/${article.id}` : '/api/articles';
      const method = article?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(articleData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Une erreur est survenue');
      }

      toast({ title: article ? 'Article mis à jour' : 'Article créé' });
      if (onSuccess) onSuccess();
      else router.push('/lpl-access-2026/panel/articles');
    } catch (error: any) {
      console.error('Error:', error);
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <Label>Titre *</Label>
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div>
            <Label>Résumé</Label>
            <Textarea value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Contenu *</Label>
            <RichTextEditor value={formData.content} onChange={(content) => setFormData({ ...formData, content })} />
          </div>
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input placeholder="Ajouter un tag..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
              <Button type="button" onClick={() => { if (tagInput.trim()) { setTags([...tags, tagInput.trim()]); setTagInput(''); } }}>Ajouter</Button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
                    #{tag}
                    <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Statut</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="review">En relecture</SelectItem>
                    <SelectItem value="scheduled">Programmé</SelectItem>
                    <SelectItem value="published">Publié</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.status === 'scheduled' && (
                <Input type="datetime-local" value={formData.scheduledPublishAt} onChange={(e) => setFormData({ ...formData, scheduledPublishAt: e.target.value })} />
              )}
              <div>
                <Label>Date de publication</Label>
                <Input
                  type="datetime-local"
                  value={formData.publishDate}
                  onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Par défaut, la date/heure actuelle. Choisissez une date passée pour
                  antidater l&apos;article (utile pour importer un ancien contenu) - il
                  apparaîtra alors trié et affiché comme s&apos;il avait été publié à cette date.
                </p>
              </div>
            </CardContent>
          </Card>

          {canAssignAuthor && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label>Auteur</Label>
                  <Select value={formData.author_id} onValueChange={(value) => setFormData({ ...formData, author_id: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {authors.map((author) => (
                        <SelectItem key={author.id} value={author.id}>{author.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Catégorie *</Label>
                <Select value={formData.category_id} onValueChange={handleCategoryChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.category_id && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Sous-catégorie</Label>
                    <button
                      type="button"
                      onClick={() => setShowNewSubcategoryInput((v) => !v)}
                      className="text-xs text-primary flex items-center gap-1 hover:underline"
                    >
                      <Plus className="h-3 w-3" /> Nouvelle
                    </button>
                  </div>
                  {availableSubcategories.length > 0 ? (
                    <Select value={formData.subcategory_id} onValueChange={(value) => setFormData({ ...formData, subcategory_id: value })}>
                      <SelectTrigger><SelectValue placeholder="Aucune (facultatif)" /></SelectTrigger>
                      <SelectContent>
                        {availableSubcategories.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    !showNewSubcategoryInput && (
                      <p className="text-xs text-muted-foreground">
                        Cette catégorie n&apos;a pas encore de sous-catégorie.
                      </p>
                    )
                  )}
                  {showNewSubcategoryInput && (
                    <div className="mt-2 flex gap-2">
                      <Input
                        placeholder="Nom de la sous-catégorie"
                        value={newSubcategoryName}
                        onChange={(e) => setNewSubcategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateSubcategory();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={isCreatingSubcategory || !newSubcategoryName.trim()}
                        onClick={handleCreateSubcategory}
                      >
                        {isCreatingSubcategory ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ajouter'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {canAssignEditorialFlags && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between">
                  <Label>À la une</Label>
                  <Switch checked={formData.isPinned} onCheckedChange={(checked) => setFormData({ ...formData, isPinned: checked })} />
                </div>
                <div className="flex justify-between">
                  <Label>Tendance</Label>
                  <Switch checked={formData.isTrending} onCheckedChange={(checked) => setFormData({ ...formData, isTrending: checked })} />
                </div>
                <div className="flex justify-between">
                  <Label>Suggestion</Label>
                  <Switch checked={formData.isSuggestion} onCheckedChange={(checked) => setFormData({ ...formData, isSuggestion: checked })} />
                </div>
                <div className="flex justify-between">
                  <Label>Breaking News</Label>
                  <Switch checked={formData.isBreaking} onCheckedChange={(checked) => setFormData({ ...formData, isBreaking: checked })} />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Image de couverture</Label>
                <Input
                  type="file"
                  accept="image/*"
                  disabled={isUploadingCover}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    setIsUploadingCover(true);
                    try {
                      // Real Storage upload (via /api/media/upload) instead
                      // of embedding a base64 data: URI directly in the
                      // article's featured_image column - the same class of
                      // bug already fixed for ads (see ad-form.tsx) and
                      // avatars, just never applied here. That base64
                      // string easily runs 500KB-2MB per image, and
                      // getArticles() (article-service.ts) does
                      // `select('*')` for every list of articles shown
                      // anywhere on the site (homepage, category pages, the
                      // admin list, the sitemap...) - every one of those
                      // was pulling the full inlined image for every
                      // article on the page. It also meant an uploaded
                      // cover image never appeared in the Media Library and
                      // could never be reused/deduplicated, since it was
                      // never actually a stored file anywhere.
                      const body = new FormData();
                      body.append('files', file);
                      body.append('type', 'image');
                      const res = await fetch('/api/media/upload', { method: 'POST', body });
                      const result = await res.json().catch(() => ({}));
                      if (!res.ok || !result.media?.[0]?.url) {
                        throw new Error(result.error || 'Échec du téléversement.');
                      }
                      setFormData((prev) => ({ ...prev, coverImage: result.media[0].url }));
                    } catch (error: any) {
                      toast({
                        title: 'Erreur',
                        description: error?.message || "Impossible de téléverser l'image de couverture.",
                        variant: 'destructive',
                      });
                    } finally {
                      setIsUploadingCover(false);
                    }
                  }}
                />
                {isUploadingCover && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Téléversement en cours...
                  </p>
                )}
                {formData.coverImage && !isUploadingCover && (
                  <div className="relative mt-2 w-full h-32 overflow-hidden rounded-lg">
                    <Image
                      src={formData.coverImage}
                      alt="Couverture"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
              <div>
                <Label>Meta description</Label>
                <Textarea value={formData.meta_description} onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })} rows={2} maxLength={160} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : article ? 'Mettre à jour' : 'Créer'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel || (() => router.back())}>Annuler</Button>
          </div>
        </div>
      </div>
    </form>
  );
}

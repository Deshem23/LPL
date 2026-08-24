'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Plus, X, Loader2 } from 'lucide-react';

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  orderIndex: number;
  articleCount?: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  orderIndex: number;
  articleCount: number;
  isActive?: boolean;
  subcategories?: Subcategory[];
}

interface CategoryFormProps {
  category?: Category;
  categories?: Category[];
  locale: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Auto-generate slug from name
const generateSlug = (text: string) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// A staged (not-yet-saved) subcategory gets a temp id in this shape -
// used to tell "still just sitting in this form's local state" apart
// from "already a real row in the categories table" when the form
// submits and when a subcategory is removed.
const isTempId = (id: string) => id.startsWith('sub-');

export function CategoryForm({
  category,
  categories = [],
  locale,
  onSuccess,
  onCancel,
}: CategoryFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [subcategories, setSubcategories] = useState<Subcategory[]>(
    category?.subcategories || []
  );
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [newSubSlug, setNewSubSlug] = useState('');

  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    description: category?.description || '',
    parentId: category?.parentId || '',
    isActive: category?.isActive ?? true,
  });

  const handleSubNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setNewSubName(name);
    setNewSubSlug(generateSlug(name));
  };

  const addSubcategory = () => {
    if (!newSubName.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom de la sous-catégorie est requis.',
        variant: 'destructive',
      });
      return;
    }

    const newSub: Subcategory = {
      id: `sub-${Date.now()}`,
      name: newSubName.trim(),
      slug: newSubSlug || generateSlug(newSubName),
      orderIndex: subcategories.length + 1,
      articleCount: 0,
    };

    setSubcategories([...subcategories, newSub]);
    setNewSubName('');
    setNewSubSlug('');
  };

  // Staged-but-unsaved subs (temp id) just come out of local state; a
  // real subcategory row gets deleted from the database right away, not
  // deferred to this form's own submit - so removal reflects immediately
  // for anyone else looking at the categories list too.
  const removeSubcategory = async (sub: Subcategory) => {
    if (isTempId(sub.id)) {
      setSubcategories((prev) => prev.filter((s) => s.id !== sub.id));
      return;
    }

    if (!confirm(`Supprimer la sous-catégorie "${sub.name}" ? Cette action est irréversible.`)) {
      return;
    }

    setRemovingId(sub.id);
    try {
      const response = await fetch(`/api/categories/${sub.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Une erreur est survenue.');
      }
      setSubcategories((prev) => prev.filter((s) => s.id !== sub.id));
      toast({ title: 'Sous-catégorie supprimée' });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible de supprimer cette sous-catégorie.',
        variant: 'destructive',
      });
    } finally {
      setRemovingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.name.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom de la catégorie est requis.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const slug = formData.slug.trim() || generateSlug(formData.name);

    try {
      const payload = {
        name: formData.name.trim(),
        slug,
        description: formData.description || undefined,
        parent_id: formData.parentId || null,
        is_active: formData.isActive,
      };

      const url = category ? `/api/categories/${category.id}` : '/api/categories';
      const method = category ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Une erreur est survenue.');
      }

      const savedCategoryId: string = category ? category.id : result.category.id;

      // Persist any subcategories staged locally (temp id, never saved)
      // as real rows under this category now that we know its real id.
      const staged = subcategories.filter((s) => isTempId(s.id));
      for (const sub of staged) {
        const subResponse = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: sub.name,
            slug: sub.slug,
            parent_id: savedCategoryId,
            order_index: sub.orderIndex,
          }),
        });
        const subResult = await subResponse.json();
        if (!subResponse.ok) {
          // The parent category itself did save - don't roll that back,
          // just surface which subcategory failed so it can be retried.
          throw new Error(
            `La catégorie a été enregistrée, mais la sous-catégorie "${sub.name}" n'a pas pu être créée : ${subResult.error || 'erreur inconnue'}`
          );
        }
      }

      toast({
        title: category ? 'Catégorie mise à jour' : 'Catégorie créée',
        description: category
          ? `La catégorie "${formData.name}" a été mise à jour${staged.length ? ` avec ${staged.length} nouvelle(s) sous-catégorie(s)` : ''}.`
          : `La catégorie "${formData.name}" a été créée${staged.length ? ` avec ${staged.length} sous-catégorie(s)` : ''}.`,
      });

      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error?.message || 'Une erreur est survenue. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get parent categories (excluding current if editing)
  const parentOptions = categories.filter((c) => c.id !== category?.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Category Name */}
        <div>
          <Label htmlFor="name">Nom de la catégorie *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => {
              const name = e.target.value;
              setFormData({ ...formData, name });
              if (!category) {
                setFormData((prev) => ({
                  ...prev,
                  name,
                  slug: generateSlug(name),
                }));
              }
            }}
            placeholder="Ex: Technologie"
            className="mt-1.5"
            required
          />
        </div>

        {/* Slug */}
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="Ex: technologie"
            className="mt-1.5 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Laissez vide pour générer automatiquement.
          </p>
        </div>

        {/* Parent Category (for subcategories) */}
        {parentOptions.length > 0 && (
          <div>
            <Label htmlFor="parentId">Catégorie parente</Label>
            <Select
              value={formData.parentId || 'none'}
              onValueChange={(value) => setFormData({ ...formData, parentId: value === 'none' ? '' : value })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Aucune (catégorie principale)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune (catégorie principale)</SelectItem>
                {parentOptions.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Sélectionnez une catégorie parente pour créer une sous-catégorie.
            </p>
          </div>
        )}

        {/* Description */}
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Décrivez brièvement cette catégorie..."
            rows={3}
            className="mt-1.5 resize-none"
          />
        </div>

        {/* Subcategories Management */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Sous-catégories</Label>
            <span className="text-sm text-muted-foreground">
              {subcategories.length} sous-catégorie(s)
            </span>
          </div>

          {/* Add Subcategory */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Nom de la sous-catégorie"
                value={newSubName}
                onChange={handleSubNameChange}
                className="w-full"
              />
              {newSubSlug && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Slug: {newSubSlug}
                </p>
              )}
            </div>
            <Button
              type="button"
              onClick={addSubcategory}
              variant="outline"
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </div>

          {/* Subcategories List */}
          {subcategories.length > 0 ? (
            <div className="space-y-2">
              {subcategories.map((sub, index) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground w-6">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {sub.name}
                        {isTempId(sub.id) && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">(non enregistrée)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        /{sub.slug}
                        {sub.articleCount !== undefined && (
                          <span className="ml-2">
                            {sub.articleCount} articles
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeSubcategory(sub)}
                    disabled={removingId === sub.id}
                  >
                    {removingId === sub.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune sous-catégorie. Ajoutez-en une ci-dessus.
            </p>
          )}
        </div>

        {/* Active Status */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <Label className="text-sm">Catégorie active</Label>
            <p className="text-xs text-muted-foreground">
              Les catégories inactives ne sont pas affichées sur le site.
            </p>
          </div>
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          className="flex-1"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : category ? (
            'Mettre à jour'
          ) : (
            'Créer la catégorie'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}

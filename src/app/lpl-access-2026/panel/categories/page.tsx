'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, GripVertical, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { CategoryForm } from '@/components/admin/categories/category-form';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  orderIndex: number;
  articleCount: number;
  isActive?: boolean;
  subcategories?: Category[];
}

// Maps a DB row (snake_case, as returned by category-service.ts /
// /api/categories) to the camelCase shape this page and CategoryForm use.
function mapCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || undefined,
    parentId: row.parent_id || undefined,
    orderIndex: row.order_index || 0,
    articleCount: row.article_count || 0,
    isActive: row.is_active,
    subcategories: (row.subcategories || []).map(mapCategory),
  };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      // ?all=true so inactive categories stay visible/manageable here,
      // unlike the public nav which only ever wants active ones.
      const res = await fetch('/api/categories?all=true', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Impossible de charger les catégories.');
      setCategories((json.categories || []).map(mapCategory));
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les catégories.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleExpand = (id: string) => {
    setExpandedCategories(prev =>
      prev.includes(id)
        ? prev.filter((catId) => catId !== id)
        : [...prev, id]
    );
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${name}" ?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Une erreur est survenue.');
      }
      toast({
        title: 'Catégorie supprimée',
        description: 'La catégorie a été supprimée avec succès.',
      });
      await fetchCategories();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible de supprimer cette catégorie.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingCategory(undefined);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditingCategory(undefined);
    fetchCategories();
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
          {[1, 2, 3, 4].map((i) => (
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
          <h2 className="text-2xl font-bold tracking-tight">Catégories</h2>
          <p className="text-muted-foreground">
            Gérez les catégories et sous-catégories de votre plateforme.
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle catégorie
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Toutes les catégories</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">
              Aucune catégorie pour le moment. Créez-en une pour commencer.
            </p>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Ordre</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Articles</TableHead>
                <TableHead className="text-center">Sous-catégories</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <>
                  <TableRow key={category.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {category.subcategories && category.subcategories.length > 0 && (
                          <button
                            onClick={() => toggleExpand(category.id)}
                            className="p-0.5 hover:bg-muted rounded"
                          >
                            {expandedCategories.includes(category.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {category.name}
                        {!category.isActive && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Inactif
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {category.slug}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {category.description || '-'}
                    </TableCell>
                    <TableCell className="text-center">{category.articleCount}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {category.subcategories?.length || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(category.id, category.name)}
                          disabled={deletingId === category.id}
                        >
                          {deletingId === category.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedCategories.includes(category.id) && category.subcategories && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={7} className="p-0">
                        <div className="p-4 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Sous-catégories de {category.name}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {category.subcategories.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-background border"
                              >
                                <div>
                                  <p className="text-sm font-medium">{sub.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    /{sub.slug}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs">
                                    {sub.articleCount} articles
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleEdit(sub)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleDelete(sub.id, sub.name)}
                                    disabled={deletingId === sub.id}
                                  >
                                    {deletingId === sub.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Modifiez les informations de la catégorie existante.'
                : 'Créez une nouvelle catégorie ou sous-catégorie.'
              }
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            category={editingCategory}
            categories={categories}
            locale="fr"
            onSuccess={handleSuccess}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingCategory(undefined);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

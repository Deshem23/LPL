'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  Calendar,
  FileText,
  AlertCircle,
  X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { formatDate, timeAgo } from '@/lib/utils';

const statusColors = {
  draft: 'bg-gray-500',
  review: 'bg-yellow-500',
  scheduled: 'bg-blue-500',
  published: 'bg-green-500',
  archived: 'bg-red-500',
};

const statusLabels = {
  draft: 'Brouillon',
  review: 'En relecture',
  scheduled: 'Programmé',
  published: 'Publié',
  archived: 'Archivé',
};

const statusIcons = {
  draft: <FileText className="h-3 w-3" />,
  review: <AlertCircle className="h-3 w-3" />,
  scheduled: <Calendar className="h-3 w-3" />,
  published: <CheckCircle className="h-3 w-3" />,
  archived: <Clock className="h-3 w-3" />,
};

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // Category/subcategory/author/date filters (see the "make the article
  // page more intuitive" request) - all applied client-side against the
  // full article list already fetched below, same pattern as the
  // existing search/status filters, rather than round-tripping to a
  // filtered API call for each combination.
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [authors, setAuthors] = useState<any[]>([]);
  const [authorFilter, setAuthorFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Picks up ?search=... from the admin header's search box (see
    // panel/layout.tsx) so landing here from that search actually shows
    // pre-filtered results instead of the full unfiltered list. Read via
    // window.location.search inside the effect (client-only, post-mount)
    // rather than next/navigation's useSearchParams(), which would force
    // this whole page under a Suspense boundary for no real benefit here.
    const initialSearch = new URLSearchParams(window.location.search).get('search');
    if (initialSearch) {
      setSearch(initialSearch);
    }
    loadArticles();
    loadFilterOptions();
  }, []);

  const loadArticles = async () => {
    setLoading(true);
    try {
      // Fetch ALL articles via the API route (server-side, uses the
      // Supabase service-role client). Do NOT call getArticles()
      // directly from this client component: it uses createAdminClient(),
      // which needs SUPABASE_SERVICE_ROLE_KEY — that env var is never
      // sent to the browser, so calling it here silently falls back to
      // the anon key and gets filtered by RLS to "published" only.
      //
      // limit bumped from 100 to 1000 - the filters below (category,
      // author, date) are meant to search across the whole article
      // catalog, not just its first page.
      const response = await fetch('/api/articles?status=all&limit=1000', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const result = await response.json();
      console.log('📊 Loaded articles:', result.articles.length);
      console.log('📊 Statuses:', result.articles.map((a: any) => a.status));
      setArticles(result.articles);
    } catch (error) {
      console.error('Error loading articles:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les articles.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Categories (with nested subcategories) and authors, for the two new
  // filter dropdowns. Best-effort: /api/users is admin-only
  // (canViewUsers), so an editor/writer/contributor loading this page
  // simply won't get an author list to filter by - the rest of the page
  // still works normally for them.
  const loadFilterOptions = async () => {
    try {
      const catsRes = await fetch('/api/categories', { cache: 'no-store' });
      if (catsRes.ok) {
        const catsJson = await catsRes.json();
        setCategories(catsJson.categories || []);
      }
    } catch (error) {
      console.error('Error loading categories for filter:', error);
    }
    try {
      const usersRes = await fetch('/api/users', { cache: 'no-store' });
      if (usersRes.ok) {
        const usersJson = await usersRes.json();
        setAuthors(usersJson.users || []);
      }
    } catch (error) {
      console.error('Error loading authors for filter:', error);
    }
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value);
    setSubcategoryFilter('all');
  };

  const subcategoriesForFilter =
    categoryFilter === 'all'
      ? []
      : categories.find((c) => c.id === categoryFilter)?.subcategories || [];

  const hasActiveFilters =
    !!search || statusFilter !== 'all' || categoryFilter !== 'all' || authorFilter !== 'all' || !!dateFilter;

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setAuthorFilter('all');
    setDateFilter('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;
    
    try {
      // Same reasoning as loadArticles: go through the API route (which
      // also checks auth via getCurrentUser()) instead of calling the
      // service-role-backed deleteArticle() directly from the browser.
      const response = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (response.ok && result.success) {
        toast({
          title: 'Article supprimé',
          description: 'L\'article a été supprimé avec succès.',
        });
        loadArticles();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'article.',
        variant: 'destructive',
      });
    }
  };

  // Filter articles based on search, status, category/subcategory, author
  // and date. article.category here is the embedded object from
  // getArticles() (see article-service.ts) - category.id is whatever
  // category_id actually points at (could itself be a subcategory row),
  // and category.parent is only set when it does point at a subcategory.
  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title?.toLowerCase().includes(search.toLowerCase()) ||
      article.excerpt?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter;

    const matchesSubcategory = subcategoryFilter === 'all' || article.category?.id === subcategoryFilter;
    const matchesCategory =
      categoryFilter === 'all' ||
      (subcategoryFilter !== 'all'
        ? true // subcategory match above is already the more specific check
        : article.category?.id === categoryFilter || article.category?.parent?.id === categoryFilter);

    const matchesAuthor = authorFilter === 'all' || article.author_id === authorFilter || article.author?.id === authorFilter;

    // dateFilter is a plain 'YYYY-MM-DD' from the <input type="date">,
    // compared against the article's LOCAL calendar date (not UTC) - two
    // admins in different timezones should each see "today" mean their
    // own today.
    const matchesDate =
      !dateFilter ||
      (() => {
        const raw = article.created_at;
        if (!raw) return false;
        const d = new Date(raw);
        if (isNaN(d.getTime())) return false;
        const pad = (n: number) => String(n).padStart(2, '0');
        const localDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        return localDate === dateFilter;
      })();

    return matchesSearch && matchesStatus && matchesCategory && matchesSubcategory && matchesAuthor && matchesDate;
  });

  // Calculate stats
  const stats = {
    total: articles.length,
    published: articles.filter(a => a.status === 'published').length,
    scheduled: articles.filter(a => a.status === 'scheduled').length,
    review: articles.filter(a => a.status === 'review').length,
    draft: articles.filter(a => a.status === 'draft').length,
    archived: articles.filter(a => a.status === 'archived').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Chargement des articles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Articles</h1>
          <p className="text-muted-foreground">Gérez tous vos articles</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/lpl-access-2026/panel/articles/new">
            <Plus className="h-4 w-4" />
            Nouvel article
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Publiés</p>
                <p className="text-2xl font-bold">{stats.published}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Programmés</p>
                <p className="text-2xl font-bold">{stats.scheduled}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En relecture</p>
                <p className="text-2xl font-bold">{stats.review}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Brouillons</p>
                <p className="text-2xl font-bold">{stats.draft}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Archivés</p>
                <p className="text-2xl font-bold">{stats.archived}</p>
              </div>
              <Clock className="h-8 w-8 text-red-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher un article..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}</span>
              <button
                onClick={loadArticles}
                className="text-primary hover:underline text-xs"
              >
                Rafraîchir
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📊 Tous les statuts</SelectItem>
                <SelectItem value="published">✅ Publiés</SelectItem>
                <SelectItem value="scheduled">📅 Programmés</SelectItem>
                <SelectItem value="review">🔍 En relecture</SelectItem>
                <SelectItem value="draft">📝 Brouillons</SelectItem>
                <SelectItem value="archived">📦 Archivés</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {subcategoriesForFilter.length > 0 && (
              <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Sous-catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sous-catégories</SelectItem>
                  {subcategoriesForFilter.map((sub: any) => (
                    <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={authorFilter} onValueChange={setAuthorFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Auteur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les auteurs</SelectItem>
                {authors.map((author) => (
                  <SelectItem key={author.id} value={author.id}>{author.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              className="w-[160px]"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={resetFilters}>
                <X className="h-3.5 w-3.5" />
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Auteur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Vues</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArticles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {hasActiveFilters
                      ? 'Aucun article ne correspond à vos filtres.'
                      : 'Aucun article trouvé. Créez votre premier article !'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredArticles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">
                      <div className="line-clamp-1 max-w-[200px]">{article.title}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {article.is_breaking && (
                          <Badge variant="destructive" className="text-[10px]">
                            🔴 Breaking
                          </Badge>
                        )}
                        {article.is_pinned && (
                          <Badge variant="default" className="text-[10px] bg-red-500">
                            📌 À la une
                          </Badge>
                        )}
                        {article.is_trending && (
                          <Badge variant="default" className="text-[10px] bg-orange-500">
                            🔥 Tendance
                          </Badge>
                        )}
                        {article.is_suggestion && (
                          <Badge variant="default" className="text-[10px] bg-purple-500">
                            💡 Suggestion
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${statusColors[article.status as keyof typeof statusColors] || 'bg-gray-500'} text-white flex items-center gap-1 w-fit`}>
                        {statusIcons[article.status as keyof typeof statusIcons]}
                        {statusLabels[article.status as keyof typeof statusLabels] || article.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        {/* category_id can point at either a top-level
                            category or a subcategory row (subcategories
                            are just categories with a parent_id) - when
                            it's a subcategory, show its parent's name too. */}
                        {article.category?.parent?.name ? (
                          <>
                            {article.category.parent.name}
                            <span className="text-xs text-muted-foreground ml-1">
                              / {article.category.name}
                            </span>
                          </>
                        ) : (
                          article.category?.name || '-'
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{article.author?.name || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {article.published_at ? timeAgo(article.published_at) : timeAgo(article.created_at)}
                    </TableCell>
                    <TableCell>{article.view_count || 0}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/lpl-access-2026/panel/articles/${article.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Modifier
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/articles/${article.slug}`} target="_blank">
                              <Eye className="mr-2 h-4 w-4" />
                              Voir
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDelete(article.id)}
                          >
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
    </div>
  );
}

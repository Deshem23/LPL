'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/shared/sidebar';
import {
  Mail,
  Twitter,
  Linkedin,
  Globe,
  Calendar,
  FileText,
  Eye,
  ArrowLeft,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface AuthorProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  roleTitle?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  joinedDate: string;
  totalArticles: number;
  totalViews: number;
}

interface AuthorClientProps {
  locale: string;
  author: AuthorProfile;
  articles: any[];
  sidebarArticles: any[];
  total: number;
  totalPages: number;
  currentPage: number;
  search: string;
}

// The interactive half of the author page - the data-fetching half now
// lives in page.tsx (a Server Component, like every other content page -
// see the comment there for why). Search and pagination here work the
// same way category-client.tsx's do: update the URL via router.push,
// which re-runs page.tsx server-side with the new searchParams.
export function AuthorClient({
  locale,
  author,
  articles,
  sidebarArticles,
  total,
  totalPages,
  currentPage,
  search: initialSearch,
}: AuthorClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    router.push(`/${locale}/author/${author.id}?${params.toString()}`);
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams();
    if (initialSearch) params.set('search', initialSearch);
    params.set('page', newPage.toString());
    router.push(`/${locale}/author/${author.id}?${params.toString()}`);
  };

  const joinedDate = new Date(author.joinedDate).toLocaleDateString(locale || 'fr', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="container mx-auto px-4 page-container">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Main Content - 8 columns */}
        <div className="lg:col-span-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>

          <div className="rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 border p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                <AvatarImage src={author.avatarUrl} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                  {author.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold">{author.name}</h1>
                  {author.roleTitle && (
                    <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                      {author.roleTitle}
                    </span>
                  )}
                </div>
                {author.bio ? (
                  <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{author.bio}</p>
                ) : (
                  <p className="mt-2 text-sm italic text-muted-foreground/60 max-w-2xl">
                    Cet auteur n&apos;a pas encore ajouté de biographie.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Membre depuis {joinedDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {author.totalArticles} article{author.totalArticles > 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {author.totalViews.toLocaleString()} vues
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {author.email && (
                    <a
                      href={`mailto:${author.email}`}
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </a>
                  )}
                  {author.twitter && (
                    <a
                      href={`https://twitter.com/${author.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#1DA1F2] transition-colors"
                    >
                      <Twitter className="h-4 w-4" />
                      Twitter
                    </a>
                  )}
                  {author.linkedin && (
                    <a
                      href={`https://linkedin.com/in/${author.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#0A66C2] transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  )}
                  {author.website && (
                    <a
                      href={author.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      Site web
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  name="search"
                  placeholder="Rechercher dans les articles de cet auteur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Rechercher</Button>
              {initialSearch && (
                <Link
                  href={`/${locale}/author/${author.id}`}
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground px-3"
                >
                  <X className="h-4 w-4" />
                  Effacer
                </Link>
              )}
            </form>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">
              {total} article{total > 1 ? 's' : ''} de {author.name}
            </h2>
            {articles.length > 0 ? (
              <div className="space-y-2">
                {articles.map((article: any) => (
                  <SimpleArticleListItem key={article.id} article={article} locale={locale} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun article trouvé pour cette recherche.</p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t pt-6">
                <p className="text-sm text-muted-foreground text-center sm:text-left">
                  Page {currentPage} sur {totalPages}
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className="h-9 w-9"
                          onClick={() => goToPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <span className="px-1 text-muted-foreground">…</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-9"
                          onClick={() => goToPage(totalPages)}
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Same Sidebar, same props shape as every other content page
            (home, category, subcategory) - previously fed by a
            client-side fetch that left it empty until the effect
            resolved; now server-rendered like everywhere else (see
            page.tsx). */}
        <div className="lg:col-span-4">
          <Sidebar
            locale={locale}
            articles={sidebarArticles}
            variant="default"
            showCategories={true}
            showNewsletter={true}
            showSearch={false}
            showLatestNews={true}
            showPinned={false}
            showAds={true}
            showSocialShare={true}
            showTrending={true}
          />
        </div>
      </div>
    </div>
  );
}

function SimpleArticleListItem({ article, locale }: { article: any; locale: string }) {
  const formattedDate = new Date(article.createdAt).toLocaleDateString(locale || 'fr', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`/${locale}/articles/${article.slug}`} className="block group">
      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
        <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          {article.coverImage ? (
            <Image
              src={article.coverImage}
              alt={article.title}
              fill
              sizes="64px"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">
            {article.title}
          </h4>
          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            <span>{formattedDate}</span>
            {article.category && (
              <>
                <span>•</span>
                <span className="text-primary">{article.category.name}</span>
              </>
            )}
            {article.readTime && (
              <>
                <span>•</span>
                <span>{article.readTime}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">👁️ {article.views || 0}</div>
      </div>
    </Link>
  );
}

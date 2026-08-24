'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArticleForm } from '@/components/admin/articles/article-form';
import { Loader2 } from 'lucide-react';

export default function EditArticlePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadArticle = async () => {
      try {
        // Go through the API route (server-side, service-role client)
        // instead of calling getArticleById() directly from this client
        // component — otherwise RLS silently blocks fetching any
        // non-published article for editing.
        const response = await fetch(`/api/articles/${params.id}`, { cache: 'no-store' });
        const json = await response.json();
        const data = response.ok ? json.article : null;
        if (data) {
          setArticle({
            id: data.id,
            title: data.title,
            excerpt: data.excerpt || '',
            content: data.content,
            status: data.status,
            category_id: data.category_id || '',
            subcategory_id: data.subcategory_id || '',
            author_id: data.author_id || '',
            isBreaking: data.is_breaking || false,
            isFeatured: data.is_featured || false,
            isSuggestion: data.is_suggestion || false,
            isTrending: data.is_trending || false,
            isPinned: data.is_pinned || false,
            scheduledPublishAt: data.scheduled_publish_at || '',
            coverImage: data.featured_image || '',
            tags: data.tags || [],
          });
        } else {
          setError('Article non trouvé');
        }
      } catch (err) {
        console.error('Error loading article:', err);
        setError('Erreur lors du chargement de l\'article');
      } finally {
        setLoading(false);
      }
    };
    loadArticle();
  }, [params.id]);

  const handleSuccess = () => {
    router.push('/lpl-access-2026/panel/articles');
  };

  const handleCancel = () => {
    router.push('/lpl-access-2026/panel/articles');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement de l&apos;article...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-red-500">Erreur</h2>
        <p className="text-muted-foreground">{error || 'Article non trouvé'}</p>
        <button 
          onClick={() => router.push('/lpl-access-2026/panel/articles')}
          className="mt-4 text-primary hover:underline"
        >
          Retour à la liste des articles
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Modifier l&apos;article</h2>
        <p className="text-muted-foreground">
          Modifiez les informations de votre article.
        </p>
      </div>
      <ArticleForm 
        article={article}
        locale="fr" 
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}

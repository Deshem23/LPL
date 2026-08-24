'use client';

import { useRouter } from 'next/navigation';
import { ArticleForm } from '@/components/admin/articles/article-form';

export default function NewArticlePage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/lpl-access-2026/panel/articles');
  };

  const handleCancel = () => {
    router.push('/lpl-access-2026/panel/articles');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Créer un article</h2>
        <p className="text-muted-foreground">
          Rédigez et publiez un nouvel article.
        </p>
      </div>
      <ArticleForm 
        locale="fr" 
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}

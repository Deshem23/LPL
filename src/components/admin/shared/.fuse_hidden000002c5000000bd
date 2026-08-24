'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface ReviewItem {
  id: string;
  title: string;
  author: string;
  submitted: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface ReviewTableProps {
  items: ReviewItem[];
  onReview?: (id: string, action: 'approve' | 'reject') => void;
}

export function ReviewTable({ items, onReview }: ReviewTableProps) {
  const [reviewing, setReviewing] = useState<string | null>(null);

  const handleAction = (id: string, action: 'approve' | 'reject') => {
    setReviewing(id);
    // Simulate API call
    setTimeout(() => {
      if (onReview) onReview(id, action);
      setReviewing(null);
      toast({
        title: action === 'approve' ? 'Article approuvé' : 'Article rejeté',
        description: action === 'approve' 
          ? 'L\'article a été approuvé avec succès.' 
          : 'L\'article a été rejeté.',
      });
    }, 500);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun article en attente de relecture.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Article</TableHead>
          <TableHead>Auteur</TableHead>
          <TableHead>Soumis</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.title}</TableCell>
            <TableCell>{item.author}</TableCell>
            <TableCell>{item.submitted}</TableCell>
            <TableCell>
              <Badge variant={
                item.status === 'pending' ? 'outline' :
                item.status === 'approved' ? 'default' :
                'destructive'
              } className={
                item.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                item.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                'bg-red-50 text-red-700 border-red-200'
              }>
                {item.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                {item.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                {item.status === 'pending' ? 'En attente' :
                 item.status === 'approved' ? 'Approuvé' :
                 'Rejeté'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" className="h-8 gap-1">
                  <Eye className="h-3 w-3" />
                  Voir
                </Button>
                {item.status === 'pending' && (
                  <>
                    <Button 
                      size="sm" 
                      variant="default" 
                      className="h-8 gap-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleAction(item.id, 'approve')}
                      disabled={reviewing === item.id}
                    >
                      <CheckCircle className="h-3 w-3" />
                      {reviewing === item.id ? '...' : 'Approuver'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="h-8 gap-1"
                      onClick={() => handleAction(item.id, 'reject')}
                      disabled={reviewing === item.id}
                    >
                      <XCircle className="h-3 w-3" />
                      {reviewing === item.id ? '...' : 'Rejeter'}
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

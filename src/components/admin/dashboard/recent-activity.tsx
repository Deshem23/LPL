'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, User, Tag, Image as ImageIcon, Settings, Clock } from 'lucide-react';

interface Activity {
  id: string;
  user: { name: string; avatar?: string };
  action: string;
  entity: string;
  timestamp: string;
  type: 'article' | 'user' | 'category' | 'media' | 'settings' | 'other';
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // There's no real audit_logs writer anywhere in this codebase yet (the
    // table exists but nothing inserts into it) - this reuses the same
    // real, articles-table-derived activity feed already built for the
    // editor dashboard (see dashboard-service.ts's getEditorDashboardData)
    // instead of the hardcoded mock list this used to render.
    fetch('/api/admin/editor-dashboard', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const mapped: Activity[] = (data.recentActivity || []).map((item: any) => ({
          id: item.id,
          user: { name: item.user, avatar: '' },
          action: item.action,
          entity: item.article,
          timestamp: item.time,
          type: 'article',
        }));
        setActivities(mapped);
      })
      .catch(() => {
        if (!cancelled) setActivities([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'article':
        return <FileText className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      case 'category':
        return <Tag className="h-4 w-4" />;
      case 'media':
        return <ImageIcon className="h-4 w-4" />;
      case 'settings':
        return <Settings className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Activité récente</CardTitle>
      </CardHeader>
      <CardContent>
        {!loading && activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune activité récente.</p>
        ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={activity.user.avatar} />
                <AvatarFallback>
                  {activity.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{activity.user.name}</span>
                  <span className="text-muted-foreground"> {activity.action} </span>
                  <span className="font-medium">{activity.entity}</span>
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {getActivityIcon(activity.type)}
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: fr })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, UserX, UserCog, Activity } from 'lucide-react';

interface UserStatsProps {
  stats: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    admins: number;
    editors: number;
    writers: number;
    contributors: number;
  };
}

export function UserStats({ stats }: UserStatsProps) {
  const cards = [
    {
      title: 'Total des utilisateurs',
      value: stats.total,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Actifs',
      value: stats.active,
      icon: UserCheck,
      color: 'bg-green-500',
    },
    {
      title: 'Inactifs',
      value: stats.inactive,
      icon: UserX,
      color: 'bg-gray-500',
    },
    {
      title: 'Suspendus',
      value: stats.suspended,
      icon: Activity,
      color: 'bg-red-500',
    },
  ];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`rounded-full p-2 ${card.color} bg-opacity-10`}>
                  <Icon className={`h-4 w-4 ${card.color.replace('bg-', 'text-')}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrateurs</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Éditeurs</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.editors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rédacteurs</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.writers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contributeurs</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contributors}</div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

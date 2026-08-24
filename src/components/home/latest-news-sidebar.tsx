'use client';

import Link from 'next/link';
import { Calendar, Clock } from 'lucide-react';

interface LatestNewsSidebarProps {
  locale: string;
}

const latestNews = [
  {
    id: '1',
    title: 'Tech Giants Announce Major Partnership',
    excerpt: 'Leading technology companies join forces to develop new AI solutions.',
    date: 'Jan 15, 2024',
    readTime: '5 min read',
    category: 'Technology',
  },
  {
    id: '2',
    title: 'Economic Growth Exceeds Expectations',
    excerpt: 'GDP growth figures show stronger than anticipated economic performance.',
    date: 'Jan 15, 2024',
    readTime: '4 min read',
    category: 'Economy',
  },
  {
    id: '3',
    title: 'New Health Guidelines Released',
    excerpt: 'Health authorities issue updated recommendations for public safety.',
    date: 'Jan 14, 2024',
    readTime: '6 min read',
    category: 'Health',
  },
  {
    id: '4',
    title: 'Cultural Festival Draws Record Crowds',
    excerpt: 'Annual cultural celebration sees unprecedented attendance.',
    date: 'Jan 14, 2024',
    readTime: '3 min read',
    category: 'Culture',
  },
  {
    id: '5',
    title: 'Sports Team Advances to Championships',
    excerpt: 'Local team secures spot in national championship after decisive victory.',
    date: 'Jan 13, 2024',
    readTime: '4 min read',
    category: 'Sports',
  },
];

export function LatestNewsSidebar({ locale }: LatestNewsSidebarProps) {
  // Show only 3 items to match the height
  const displayNews = latestNews.slice(0, 3);

  return (
    <div className="h-[520px] flex flex-col rounded-2xl bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-bold">Latest News</h3>
        <Link href={`/${locale}/articles`} className="text-sm text-primary hover:underline">
          View All
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {displayNews.map((news) => (
          <Link key={news.id} href={`/${locale}/articles/${news.id}`}>
            <div className="group rounded-xl bg-card p-3 transition-all hover:bg-accent/30 hover:shadow-sm">
              <span className="text-xs font-semibold text-primary">
                {news.category}
              </span>
              <h4 className="mt-1 font-medium group-hover:text-primary transition-colors line-clamp-2 text-sm">
                {news.title}
              </h4>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {news.excerpt}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {news.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {news.readTime}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

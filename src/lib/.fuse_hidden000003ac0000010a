import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'Date non disponible';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Date non disponible';
    
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return 'Date non disponible';
  }
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return 'Date non disponible';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Date non disponible';
    
    return new Intl.DateTimeFormat('fr-FR', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return 'Date non disponible';
  }
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return 'Date non disponible';
  
  try {
    const now = new Date();
    const past = new Date(date);
    if (isNaN(past.getTime())) return 'Date non disponible';
    
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}m`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return formatDateShort(past);
  } catch {
    return 'Date non disponible';
  }
}

export function truncateText(text: string, length: number): string {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

export function generateSlug(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getReadingTime(text: string): number {
  if (!text) return 0;
  const wordsPerMinute = 200;
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

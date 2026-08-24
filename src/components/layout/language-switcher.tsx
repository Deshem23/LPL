'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { locales, localeNames, localeFlags, defaultLocale } from '@/i18n/config';

export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  
  const currentLocale = pathname.split('/')[1] || defaultLocale;

  const switchLanguage = (locale: string) => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0 && locales.some(lang => lang === segments[0])) {
      segments[0] = locale;
    } else {
      segments.unshift(locale);
    }
    const newPath = '/' + segments.join('/');
    router.push(newPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 transition-all">
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-background dark:bg-[#1a2a3a] border shadow-lg">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => switchLanguage(locale)}
            className="flex items-center justify-between cursor-pointer hover:bg-muted dark:hover:bg-white/10"
          >
            <span className="flex items-center gap-2">
              <span>{localeFlags[locale]}</span>
              <span className="text-foreground dark:text-white/80">{localeNames[locale]}</span>
            </span>
            {currentLocale === locale && (
              <span className="text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

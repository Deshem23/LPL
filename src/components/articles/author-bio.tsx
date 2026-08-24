'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Twitter, Linkedin, Globe, ArrowRight } from 'lucide-react';

interface Author {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  email?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  role?: string;
}

interface AuthorBioProps {
  author: Author;
  locale?: string;
}

export function AuthorBio({ author, locale = 'fr' }: AuthorBioProps) {
  return (
    // Was p-6 md:p-8 with a flex-col (stacked) layout below md, plus a
    // full-size h-16 avatar, xl title, and text-sm everywhere - inside
    // the article modal (which is already width-capped) that stacked
    // block made the author card feel oversized on a phone. Keeping the
    // avatar beside the name at every width (instead of stacking) and
    // scaling padding/avatar/text down on small screens keeps this
    // compact without losing any of the info.
    <div className="rounded-2xl border bg-gradient-to-br from-muted/30 to-muted/10 p-4 sm:p-6 md:p-8">
      <div className="flex flex-row items-start sm:items-center gap-3 sm:gap-6">
        <Link
          href={`/${locale}/author/${author.id}`}
          className="flex-shrink-0 group"
        >
          <Avatar className="h-12 w-12 sm:h-16 sm:w-16 ring-2 sm:ring-4 ring-primary/10 shadow-xl cursor-pointer hover:ring-primary/20 transition-all group-hover:scale-105">
            <AvatarImage src={author.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-base sm:text-xl">
              {author.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href={`/${locale}/author/${author.id}`}
              className="hover:underline group"
            >
              <h4 className="text-base sm:text-xl font-bold group-hover:text-primary transition-colors">
                {author.name}
              </h4>
            </Link>
            {author.role && (
              <span className="text-[11px] sm:text-sm text-muted-foreground bg-muted px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                {author.role}
              </span>
            )}
            <Link
              href={`/${locale}/author/${author.id}`}
              className="inline-flex items-center gap-1 text-xs sm:text-sm text-primary hover:underline sm:ml-auto"
            >
              Voir le profil
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {author.bio && (
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-base text-muted-foreground leading-relaxed max-w-2xl line-clamp-2 sm:line-clamp-none">
              {author.bio}
            </p>
          )}
          <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
            {author.email && (
              <a
                href={`mailto:${author.email}`}
                className="inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Email
              </a>
            )}
            {author.twitter && (
              <a
                href={`https://twitter.com/${author.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-[#1DA1F2] transition-colors"
              >
                <Twitter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Twitter
              </a>
            )}
            {author.linkedin && (
              <a
                href={`https://linkedin.com/in/${author.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-[#0A66C2] transition-colors"
              >
                <Linkedin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                LinkedIn
              </a>
            )}
            {author.website && (
              <a
                href={author.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Site web
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

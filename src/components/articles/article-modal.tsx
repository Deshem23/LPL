'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Calendar, Clock, User, Eye, Share2, Bookmark } from 'lucide-react';
import { formatDate, getReadingTime } from '@/lib/utils';
import { SocialShare } from '@/components/articles/social-share';
import { AdComponent } from '@/components/shared/ad-component';
import { ArticleTags } from '@/components/articles/article-tags';
import { AuthorBio } from '@/components/articles/author-bio';
import { useRouter } from 'next/navigation';

interface ArticleModalProps {
  article: any;
  onClose?: () => void;
  locale: string;
}

export function ArticleModal({ article, onClose, locale }: ArticleModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  // Tracks whether the slide-in entrance transition has actually finished
  // playing. Tailwind's translate-y-0 still sets `transform:
  // translate(0px, 0px)` - a non-`none` transform - not the same as
  // never having a transform at all. `position: sticky` on a descendant
  // (the cover image below) silently stops working under ANY ancestor
  // with a live transform, even a visually-inert translate(0,0) - that's
  // the actual reason the cover image wasn't sticking while scrolling,
  // the transform from this entrance animation was never removed once
  // the animation was done playing. Once hasEntered flips true, the
  // wrapper below drops the transform/transition classes entirely
  // (translateY(0) and "no transform" render identically, so nothing
  // visually changes) so the sticky image works for the rest of the
  // time the modal is open. isVisible flipping back to false (closing)
  // re-enables the transform classes for the exit animation.
  const [hasEntered, setHasEntered] = useState(false);
  const animatingTransform = !hasEntered || !isVisible;
  const router = useRouter();

  useEffect(() => {
    setIsVisible(true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Falls back to router.back() so this works when the parent page is a
    // Server Component and can't pass a client-side onClose callback.
    setTimeout(() => (onClose ? onClose() : router.back()), 300);
  };

  // Handle author click - redirect to author page
  const handleAuthorClick = (authorId: string) => {
    handleClose();
    // Use window.location for a full page navigation after modal closes
    setTimeout(() => {
      window.location.href = `/${locale}/author/${authorId}`;
    }, 350);
  };

  // Get the date safely
  const getDate = () => {
    return article.published_at || article.createdAt || article.created_at || new Date().toISOString();
  };

  const coverImage = article.featured_image || article.coverImage;

  return (
    <>
      {/* Backdrop, as its own element - NOT an ancestor of the modal
          card below. backdrop-filter (backdrop-blur-md) breaks
          position: sticky for ANY descendant, which is why this stays
          split out instead of wrapping the card (see the close button's
          own backdrop-blur below for why a SIBLING with backdrop-filter
          is fine - only ancestors of the sticky image are the problem). */}
      {/* No onClick here - the original single div never closed on
          backdrop click either (only the X button / author link did),
          so this split keeps that exact same behavior rather than
          introducing a new interaction. */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md" aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6">
      <div
        className={`relative w-full max-w-4xl mx-auto my-4 ${
          animatingTransform
            ? `transition-all duration-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`
            : ''
        }`}
        onTransitionEnd={() => setHasEntered(true)}
      >
        {/* Card shell: rounded-2xl + overflow-y-auto directly on the SAME
            div that holds the sticky cover image below - deliberately
            NOT split into a separate outer "frame" div wrapping an inner
            scroll div. overflow-hidden plus a live border-radius on an
            ANCESTOR of a sticky element is its own known cross-browser
            sticky-breaking combination, in the same family as the
            transform/backdrop-filter bugs already fought and fixed in
            this file - not worth the risk for a purely cosmetic corner.
            overflow-y-auto here clips content to these same rounded
            corners without introducing a new ancestor between the sticky
            image and its containing block. */}
        <div className="relative rounded-2xl bg-background border border-border/40 shadow-2xl shadow-black/30 max-h-[88vh] overflow-y-auto">
          {/* Close Button - glass pill, floats above the sticky image
              (z-20 vs the image's z-10) so it stays visible and
              clickable the whole time the image is pinned. Living as a
              SIBLING of the image (not an ancestor) is what makes its
              own backdrop-blur safe - it can't break sticky for
              elements it isn't a parent of. */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 z-20 rounded-full p-2.5 bg-background/70 hover:bg-background text-foreground/70 hover:text-foreground shadow-md backdrop-blur-md border border-border/40 transition-all cursor-pointer"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Cover Image - the very first thing inside the card now, an
              immersive banner flush against the top and side corners,
              rather than sitting below the title. This also resolves
              the "text visible above the image" problem at its root:
              since nothing precedes the image anymore, there's no
              header text left to fade at a top edge. Title, meta pills
              and the rest of the article now all scroll up FROM BELOW
              instead, which is exactly the transition the fade strip
              beneath the image was already built and confirmed to
              handle well - one fade mechanism instead of two.

              position: sticky needs a scrollable ancestor to stick
              within, which is this card div itself (overflow-y-auto
              above) - it unsticks naturally once the end of the
              scrollable content is reached. z-10 keeps it above content
              flowing past underneath; isolate forces it into its own
              guaranteed stacking context so z-index resolves
              unambiguously against its siblings. bg-muted is a neutral
              placeholder while the image loads. rounded-t-2xl matches
              the card's own corner radius now that the image sits
              flush against it - the card's overflow-y-auto clip already
              guarantees this, this is just belt-and-suspenders for the
              corner pixels. */}
          {coverImage ? (
            <>
              <div className="sticky top-0 z-10 isolate h-[280px] w-full overflow-hidden rounded-t-2xl bg-muted">
                <Image
                  src={coverImage}
                  alt={article.title || 'Article'}
                  fill
                  sizes="(min-width: 768px) 800px, 100vw"
                  priority
                  className="object-cover"
                />
              </div>
              {/* Fade strip - its own sticky element, pinned flush
                  against the image's bottom edge (top-[280px] matches
                  the image's h-[280px], so once both are stuck this
                  sits immediately below it with no gap). Scrolling text
                  visually fades out over this ~40px band as it passes
                  underneath instead of being hard-clipped by the
                  image's opaque edge - the fix already confirmed
                  working, now handling the title/meta block too, since
                  it scrolls up through here on its way behind the image
                  just like the rest of the article body always did.
                  bg-gradient-to-b from-background (opaque, matching the
                  card) to transparent is the actual fade;
                  pointer-events-none keeps it from ever intercepting
                  clicks/selection on the text passing beneath it. */}
              <div
                className="sticky top-[280px] z-10 isolate h-10 w-full bg-gradient-to-b from-background to-transparent pointer-events-none"
                aria-hidden="true"
              />
            </>
          ) : null}

          {/* Article Content */}
          <div className="p-6 sm:p-8 md:p-10">
            <article className="max-w-full">
              {/* Header */}
              <header className="space-y-4">
                <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{article.title || 'Article'}</h1>
                <p className="text-lg text-muted-foreground">{article.excerpt || ''}</p>

                {/* Metadata pills - same data and handler as before,
                    just styled as compact rounded badges (icon + label)
                    instead of a plain inline row, closer to a magazine
                    byline than a form of metadata dump. */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs font-medium text-muted-foreground">
                  <button
                    onClick={() => handleAuthorClick(article.author?.id || article.author_id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/60 px-3 py-1.5 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span className="font-semibold">{article.author?.name || article.author_name || 'Auteur inconnu'}</span>
                  </button>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/30 bg-muted/40 px-3 py-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(getDate())}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/30 bg-muted/40 px-3 py-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {getReadingTime(article.content || '')} min
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/30 bg-muted/40 px-3 py-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    {article.view_count || article.views || 0} vues
                  </span>
                </div>
              </header>

              {/* Soft gradient divider instead of a flat border line */}
              <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden="true" />

              {/* Content - Tailwind Typography's `prose` sets its base
                  line-height (1.75) on the .prose container itself, not
                  per-element, so an earlier pass (prose-p:leading-relaxed,
                  1.625) only nudged individual <p> tags while the
                  container's looser 1.75 still won most of the reading
                  rhythm. leading-normal directly on this wrapper
                  overrides that base line-height outright, and
                  prose-p:leading-normal keeps <p> consistent with it -
                  kept unchanged from that tuning pass, which matched
                  this to the editor's own spacing. prose-headings:font-bold/
                  tracking-tight and prose-img:rounded-xl below are
                  purely additive polish. */}
              <div
                className="prose dark:prose-invert max-w-none leading-normal prose-p:my-2 prose-p:leading-normal prose-headings:font-bold prose-headings:tracking-tight prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-blockquote:my-2 prose-img:rounded-xl"
                dangerouslySetInnerHTML={{ __html: article.content || '' }}
              />

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="mt-8">
                  <ArticleTags tags={article.tags} />
                </div>
              )}

              {/* Author Bio - the real publishing user's info (bio, role,
                  social links), clickable through to their full profile at
                  /author/[id]. */}
              {article.author && (
                <div className="mt-8">
                  <AuthorBio
                    author={{
                      id: article.author.id,
                      name: article.author.name,
                      avatar: article.author.avatarUrl,
                      bio: article.author.bio,
                      email: article.author.email,
                      twitter: article.author.twitter,
                      linkedin: article.author.linkedin,
                      website: article.author.website,
                      role: article.author.roleTitle,
                    }}
                    locale={locale}
                  />
                </div>
              )}

              {/* Ad Component - In Article */}
              <div className="mt-8">
                <AdComponent type="in-article" />
              </div>

              {/* Social Share & Actions */}
              <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden="true" />
              <div className="mt-6 flex flex-wrap items-center justify-between pt-2">
                <SocialShare
                  url={`${process.env.NEXT_PUBLIC_APP_URL}/${locale}/articles/${article.slug}`}
                  title={article.title || ''}
                />
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Bookmark className="h-4 w-4" />
                  Enregistrer
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

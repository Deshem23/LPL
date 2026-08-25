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

  return (
    <>
      {/* Backdrop, as its own element - NOT an ancestor of the modal
          card below. backdrop-filter (backdrop-blur-sm) breaks
          position: sticky for ANY descendant, not just elements
          directly between the sticky element and its scroll container -
          this is a well-documented cross-browser quirk (same family of
          bug as a `transform` on an ancestor, see the hasEntered/
          animatingTransform logic above). This div previously wrapped
          the entire modal, including the sticky cover image, which is
          why the image kept failing to stay properly locked in place
          for the WHOLE time the modal was open (not just during the
          300ms entrance animation the earlier fix addressed) - text
          kept "passing through" it because the browser's sticky
          calculation was continuously broken by this ancestor filter,
          not just momentarily. */}
      {/* No onClick here - the original single div never closed on
          backdrop click either (only the X button / author link did),
          so this split keeps that exact same behavior rather than
          introducing a new interaction. */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div
        className={`relative w-full max-w-4xl mx-auto my-8 ${
          animatingTransform
            ? `transition-all duration-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`
            : ''
        }`}
        onTransitionEnd={() => setHasEntered(true)}
      >
        {/* max-h/overflow-y-auto keeps this a standard, contained dialog
            instead of a page-length block - a previous version was
            max-w-5xl with no height cap, so a long article turned the
            "modal" into something the size of a whole page; that was
            then narrowed to max-w-2xl, which went too far the other way
            and made reading an article feel cramped. max-w-4xl is the
            middle ground: wide enough to read comfortably, still capped
            in height. */}
        <div className="relative rounded-xl bg-background p-4 sm:p-6 md:p-8 shadow-2xl max-h-[85vh] overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={handleClose}
            // z-20, one above the sticky cover image's z-10 below - now
            // that the image actually sticks (see the transform fix
            // above), it can end up pinned right under this button; this
            // keeps the close button clickable and visible on top of it
            // instead of the two fighting over the same stacking layer.
            className="absolute right-4 top-4 z-20 rounded-full p-2 hover:bg-muted transition-colors bg-background/80 backdrop-blur-sm"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Article Content */}
          <article className="max-w-full">
            {/* Header */}
            <header className="space-y-4">
              <h1 className="text-3xl font-bold md:text-4xl">{article.title || 'Article'}</h1>
              <p className="text-lg text-muted-foreground">{article.excerpt || ''}</p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {/* Author - Clickable to redirect to author page */}
                <button
                  onClick={() => handleAuthorClick(article.author?.id || article.author_id)}
                  className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                >
                  <User className="h-4 w-4" />
                  <span className="font-medium">{article.author?.name || article.author_name || 'Auteur inconnu'}</span>
                </button>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(getDate())}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {getReadingTime(article.content || '')} min
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {article.view_count || article.views || 0} vues
                </span>
              </div>
            </header>

            {/* Cover Image - sticky so it stays pinned in view once
                scrolling reaches it, while the header above scrolls away
                and the content below keeps scrolling past it. position:
                sticky needs a scrollable ancestor to stick within, which
                is the modal's own overflow-y-auto box below - it unsticks
                naturally once the end of this <article> is reached, since
                nothing constrains an earlier unstick point. z-10 keeps it
                above the content flowing past underneath during that
                transition; shadow-lg gives it a visible edge against the
                content once pinned, instead of a hard flat cutoff.
                bg-background makes the box itself opaque (fixes the
                header text showing through anywhere the photo hasn't
                painted yet).

                The spacer div below (h-6, replacing what used to be
                mt-6 directly on the sticky element) is the fix for the
                remaining gap: a CSS margin is never painted - it's
                genuinely empty space - so a margin-top on the STICKY
                element itself stays empty even once stuck, and that
                strip is exactly where scrolling text was still visible
                sliding past underneath. A separate, ordinary (non-sticky)
                spacer scrolls away with the rest of the header instead,
                so once the image is stuck it's flush against the top of
                the scroll area with nothing behind it. */}
            {article.featured_image || article.coverImage ? (
              <>
                <div className="h-6" aria-hidden="true" />
                {/* isolate forces this element into its own guaranteed
                    stacking context, so its z-index is resolved cleanly
                    against its siblings with no ambiguity from any
                    nested context above or below it - the last bit of
                    insurance on top of position: sticky actually working
                    (fixed), the box being fully opaque (fixed), and
                    nothing left above it in paint order, so content
                    scrolling underneath is covered for the image's
                    entire height, not just glimpsed at one edge. */}
                <div className="sticky top-0 z-10 isolate h-[280px] w-full overflow-hidden rounded-lg bg-background shadow-lg">
                  <Image
                    src={article.featured_image || article.coverImage}
                    alt={article.title || 'Article'}
                    fill
                    sizes="(min-width: 768px) 720px, 100vw"
                    priority
                    className="object-cover"
                  />
                </div>
                {/* Fade strip - its own sticky element, pinned flush
                    against the image's bottom edge (top-[280px] matches
                    the image's h-[280px], so once both are stuck this
                    sits immediately below it with no gap). Rather than
                    relying purely on the image being a perfect opaque
                    hard cutoff, scrolling text now visually fades out
                    over this ~40px band as it passes underneath -
                    softer, more forgiving UX, and it reads as
                    intentional instead of an abrupt clip. bg-gradient-to-b
                    from-background (opaque, matching the card) to
                    transparent is the actual fade; pointer-events-none
                    keeps it from ever intercepting clicks/selection on
                    the article text passing beneath it. */}
                <div
                  className="sticky top-[280px] z-10 isolate h-10 w-full bg-gradient-to-b from-background to-transparent pointer-events-none"
                  aria-hidden="true"
                />
              </>
            ) : null}

            {/* Content - Tailwind Typography's `prose` sets its base
                line-height (1.75) on the .prose container itself, not
                per-element, so the first pass (prose-p:leading-relaxed,
                1.625) only nudged individual <p> tags and the container's
                looser 1.75 was still winning most of the visual reading
                rhythm. Setting `leading-normal` directly on this wrapper
                overrides that base container line-height outright, and
                prose-p:leading-normal keeps <p> consistent with it. Margins
                tightened further too (my-3 -> my-2, matching the editor). */}
            <div
              className="mt-6 prose dark:prose-invert max-w-none leading-normal prose-p:my-2 prose-p:leading-normal prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-blockquote:my-2"
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
            <div className="mt-6 flex flex-wrap items-center justify-between border-t pt-6">
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
    </>
  );
}

'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';

interface AdMediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  title?: string;
  description?: string;
  linkUrl?: string;
}

interface Ad {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  media?: AdMediaItem[];
  linkUrl?: string;
  isTextOnly: boolean;
  textContent?: string;
  sponsorName?: string;
  buttonText?: string;
  backgroundColor?: string;
  textColor?: string;
}

interface Slide {
  ad: Ad;
  /** The specific media item this slide shows, if any (title/description/
   *  link here override the parent ad's own when present). */
  media?: AdMediaItem;
}

interface AdComponentProps {
  // Only placements an actual component on the site requests. The ticker
  // ("📢 Annonce" bar) is handled directly in header.tsx instead of here,
  // since it needs a marquee layout rather than a single card slot.
  type?: 'sidebar' | 'in-article';
  className?: string;
  /** Auto-advance interval in ms when there's more than one slide. Default 5000. */
  intervalMs?: number;
}

// Fetches real ads for this placement from the public API (never calls
// ad-service.ts directly - that needs the service-role key, which is
// never sent to the browser). Renders nothing when there's no active ad
// for this placement.
//
// Every media item (image or video) belonging to every active ad for
// this placement becomes one "slide" in a single carousel - so a single
// ad with 4 slides fades through all 4 (each with its own title/
// description/link if set), and if there are multiple active ads too, it
// keeps fading into the next ad's slides right after, all as one
// continuous rotation (with dot navigation to jump anywhere directly).
export function AdComponent({ type = 'sidebar', className = '', intervalMs = 6000 }: AdComponentProps) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/public/ads?placement=${encodeURIComponent(type)}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const list: Ad[] = data.ads || [];
        setAds(list);
        setActiveIndex(0);
        // Fire-and-forget view tracking, once per ad per mount (not once
        // per rotation/slide - that would inflate view counts every 5s).
        list.forEach((ad) => {
          fetch(`/api/ads/${ad.id}/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'view' }),
          }).catch(() => {});
        });
      })
      .catch(() => {
        if (!cancelled) setAds([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type]);

  // Flatten each ad's own media items into individual slides, so a
  // multi-slide ad carousels through its own images/videos the same way
  // multiple separate ads carousel through each other. Falls back to the
  // older `images`/`imageUrl` fields for ads saved before per-slide
  // media existed. A text-only ad, or an image ad with no media at all
  // (shouldn't normally happen - the form requires at least one slide),
  // contributes exactly one slide.
  const slides = useMemo<Slide[]>(() => {
    return ads.flatMap((ad) => {
      if (ad.isTextOnly) return [{ ad }];
      if (ad.media && ad.media.length > 0) {
        return ad.media.map((media) => ({ ad, media }));
      }
      const legacyImages = ad.images && ad.images.length > 0 ? ad.images : ad.imageUrl ? [ad.imageUrl] : [];
      if (legacyImages.length === 0) return [{ ad }];
      return legacyImages.map((url) => ({ ad, media: { id: url, type: 'image' as const, url } }));
    });
  }, [ads]);

  // Auto-advance the slideshow. Only runs with 2+ slides - a single slide
  // just sits still, no need for a timer.
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [slides.length, intervalMs]);

  const handleClick = (adId: string) => {
    fetch(`/api/ads/${adId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'click' }),
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div className={`apple-card p-4 text-center ${className}`}>
        <div className="animate-pulse h-24 bg-muted/20 rounded-xl" />
      </div>
    );
  }

  if (slides.length === 0) {
    // No active ad configured for this placement - render a neutral
    // empty slot instead of a mock "[ Espace publicitaire ]" banner, so
    // production pages never show obviously-fake placeholder content.
    return null;
  }

  const slide = slides[Math.min(activeIndex, slides.length - 1)];
  const { ad, media } = slide;
  // Per-slide title/description/link win when set; otherwise fall back
  // to the ad's own.
  const slideTitle = media?.title || ad.title;
  const slideDescription = media?.description || ad.description;
  const slideLinkUrl = media?.linkUrl || ad.linkUrl;
  // Fixed media box height per placement, so every slide (image or
  // video, whatever its natural aspect ratio) renders at the same size
  // instead of the card resizing itself slide to slide. Sidebar cards are
  // taller/narrower; in-article is a short wide banner.
  const mediaBoxClass = type === 'in-article' ? 'h-24' : 'h-40';

  return (
    <div className={`apple-card p-4 text-center ${className}`}>
      <span className="text-xs text-muted-foreground uppercase tracking-wider">
        {ad.sponsorName ? `Publicité · ${ad.sponsorName}` : 'Publicité'}
      </span>
      {/* Keying on the slide (media id, or ad id for text-only) restarts
          the fade-in animation on every rotation, giving the cross-fade
          effect between slides - whether that's a new image/video on the
          same ad, or a different ad entirely. */}
      <a
        key={media?.id || `${ad.id}-text`}
        href={slideLinkUrl}
        target="_blank"
        rel="noopener sponsored noreferrer"
        onClick={() => handleClick(ad.id)}
        className="mt-2 block animate-fade-in"
      >
        {ad.isTextOnly ? (
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: ad.backgroundColor || undefined,
              color: ad.textColor || undefined,
            }}
          >
            <p className="font-medium">{ad.title}</p>
            {ad.textContent && <p className="text-sm mt-1">{ad.textContent}</p>}
            {ad.buttonText && (
              <span className="inline-block mt-2 text-sm font-semibold underline">
                {ad.buttonText}
              </span>
            )}
          </div>
        ) : media ? (
          <>
            {/* Fixed-height box so the card doesn't grow/shrink between
                slides - a tall portrait image, a widescreen video, and a
                square image all get cropped (object-cover) to the same
                footprint instead of each dictating their own height. */}
            <div className={`relative w-full ${mediaBoxClass} rounded-xl overflow-hidden bg-muted/10`}>
              {media.type === 'video' ? (
                <video
                  src={media.url}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <Image src={media.url} alt={slideTitle} fill sizes="(min-width: 1024px) 320px, 100vw" className="object-cover" />
              )}
            </div>
            {(slideTitle || slideDescription) && (
              <div className="mt-2 text-left">
                {slideTitle && <p className="text-sm font-medium">{slideTitle}</p>}
                {slideDescription && (
                  <p className="text-xs text-muted-foreground mt-0.5">{slideDescription}</p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl bg-muted/20 p-4">
            <p className="text-sm font-medium">{ad.title}</p>
            {ad.description && <p className="text-xs text-muted-foreground mt-1">{ad.description}</p>}
          </div>
        )}
      </a>

      {slides.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.media?.id || `${s.ad.id}-text-${i}`}
              type="button"
              aria-label={`Publicité ${i + 1}`}
              onClick={() => setActiveIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

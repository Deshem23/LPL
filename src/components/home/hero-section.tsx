'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Article } from '@/lib/api/articles';

interface HeroSectionProps {
  locale: string;
  articles?: Article[];
}

export function HeroSection({ locale, articles }: HeroSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // No hardcoded placeholder fallback here on purpose: showing fake
  // demo articles (with a broken "read more" link, since they have no
  // real slug) when there's no real data is worse than an honest empty
  // state below.
  const slides = articles ?? [];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  if (!slides || slides.length === 0) {
    return (
      <div className="h-[260px] sm:h-[340px] md:h-[420px] lg:h-[520px] w-full rounded-3xl bg-muted/30 flex items-center justify-center">
        <p className="text-muted-foreground">Aucun article disponible</p>
      </div>
    );
  }

  return (
    // Fixed height was h-[520px] at every breakpoint, so on a narrow
    // phone (~375px wide) the slide was still 520px tall - a nearly
    // square/portrait block towering over the rest of the page. Scaling
    // the height down on smaller screens keeps the slider's proportions
    // sane on mobile while still reaching the original 520px on desktop.
    <div className="relative h-[260px] sm:h-[340px] md:h-[420px] lg:h-[520px] overflow-hidden rounded-2xl md:rounded-3xl">
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="min-w-full h-full relative">
            {/* Background Image */}
            <div className="absolute inset-0 bg-cover bg-center">
              {slide.coverImage ? (
                <Image
                  src={slide.coverImage}
                  alt={slide.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5" />
              )}
            </div>

            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20" />

            {/* Content - Without author, date, read time */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-10">
              <div className="max-w-3xl">
                {slide.category && (
                  <span className="inline-block rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white">
                    {slide.category.name}
                  </span>
                )}
                <h2 className="mt-2 sm:mt-3 text-base sm:text-xl md:text-2xl lg:text-3xl font-bold text-white leading-tight line-clamp-2 sm:line-clamp-none">
                  {slide.title}
                </h2>
                {slide.excerpt && (
                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm md:text-base text-white/90 line-clamp-1 sm:line-clamp-2">
                    {slide.excerpt}
                  </p>
                )}
                <Link
                  href={`/${locale}/articles/${slide.slug}`}
                  className="mt-2.5 sm:mt-4 inline-block rounded-full bg-white text-gray-900 px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold hover:bg-white/90 transition-colors shadow-lg"
                >
                  Lire la suite
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 backdrop-blur-sm p-1.5 sm:p-2.5 text-white hover:bg-black/60 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 backdrop-blur-sm p-1.5 sm:p-2.5 text-white hover:bg-black/60 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all ${
                currentSlide === index ? 'w-8 bg-white' : 'w-2 bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

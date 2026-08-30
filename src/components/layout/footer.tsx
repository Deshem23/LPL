'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MdEmail, MdPhone, MdLocationOn } from 'react-icons/md';
import { SOCIAL_LINKS } from '@/lib/config/social-links';

interface FooterProps {
  locale: string;
}

export function Footer({ locale }: FooterProps) {
  const categories = [
    { slug: 'economie', label: 'Économie' },
    { slug: 'societe', label: 'Société' },
    { slug: 'politique', label: 'Politique' },
    { slug: 'sante', label: 'Santé' },
    { slug: 'international', label: 'International' },
    { slug: 'technologie', label: 'Technologie' },
    { slug: 'sport', label: 'Sport' },
    { slug: 'insolite', label: 'Insolite' },
  ];

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1a2a3a] text-white border-t border-[#2a3a4a]">
      <div className="container py-8 sm:py-12">
        {/* Was grid-cols-1, so on mobile the brand block, Catégories,
            Liens Rapides, and Contact stacked as 4 full-width sections
            one under another - each with its own heading + list, which is
            what made the footer so tall on phones. grid-cols-2 lets the
            three link/contact columns sit two-up (brand still spans the
            full width above them, since a logo + description + social
            icons row doesn't work squeezed into a half column). */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:gap-10 md:grid-cols-5">
          <div className="col-span-2 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 sm:h-12 sm:w-12 md:h-14 md:w-14 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="Les Pages Libres"
                  fill
                  sizes="56px"
                  className="object-contain"
                />
              </div>
              <div>
                <span className="text-lg sm:text-xl md:text-2xl font-bold block leading-tight text-white">
                  Les Pages Libres
                </span>
                <span className="text-xs sm:text-sm text-white/60">
                  Votre source d&apos;information
                </span>
              </div>
            </div>
            <p className="text-white/70 text-xs sm:text-sm max-w-sm leading-relaxed">
              Votre source de confiance pour l&apos;actualité locale, et internationale.
            </p>
            <div className="flex flex-wrap gap-2.5 sm:gap-3 pt-1 sm:pt-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target={social.isPlaceholder ? undefined : '_blank'}
                  rel={social.isPlaceholder ? undefined : 'noopener noreferrer'}
                  onClick={social.isPlaceholder ? (e) => e.preventDefault() : undefined}
                  className={`inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all duration-300 ${
                    social.isPlaceholder
                      ? 'cursor-default opacity-50'
                      : 'hover:bg-white/20 hover:text-white'
                  }`}
                  aria-label={social.name}
                  title={social.isPlaceholder ? 'Bientôt disponible' : social.name}
                >
                  <social.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm sm:text-lg font-semibold text-white mb-2.5 sm:mb-4">Catégories</h4>
            <ul className="space-y-2 sm:space-y-2.5">
              {categories.map((category) => (
                <li key={category.slug}>
                  {/* Plain <a>, not next/link's <Link> - see the matching
                      comment in category-card.tsx / layout/header.tsx for
                      why (avoids a stale Router Cache payload on soft nav). */}
                  <a
                    href={`/${locale}/categories/${category.slug}`}
                    className="text-white/70 hover:text-white transition-colors text-xs sm:text-sm"
                  >
                    {category.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm sm:text-lg font-semibold text-white mb-2.5 sm:mb-4">Liens Rapides</h4>
            <ul className="space-y-2 sm:space-y-2.5">
              <li>
                {/* Plain <a>, not next/link's <Link> - home is a
                    force-dynamic page whose "Dernières actualités"/"À la
                    une"/"Tendances" sections were going stale on a soft
                    <Link> navigation back to it (client Router Cache),
                    same issue already fixed for category links. */}
                <a href={`/${locale}`} className="text-white/70 hover:text-white transition-colors text-xs sm:text-sm">
                  Accueil
                </a>
              </li>
              <li>
                <a href={`/${locale}/articles`} className="text-white/70 hover:text-white transition-colors text-xs sm:text-sm">
                  Archives
                </a>
              </li>
              <li>
                <Link href={`/${locale}/about`} className="text-white/70 hover:text-white transition-colors text-xs sm:text-sm">
                  À propos
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/contact`} className="text-white/70 hover:text-white transition-colors text-xs sm:text-sm">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <h4 className="text-sm sm:text-lg font-semibold text-white mb-2.5 sm:mb-4">Contact</h4>
            <ul className="space-y-2.5 sm:space-y-3.5">
              <li className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm text-white/70">
                <MdLocationOn className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0 text-white/50" />
                <span>Delmas 75, Port-au-Prince, Haïti</span>
              </li>
              <li className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm text-white/70">
                <MdEmail className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0 text-white/50" />
                <a href="mailto:contact.lespageslibres@gmail.com" className="hover:text-white transition-colors break-all">
                  contact.lespageslibres@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm text-white/70">
                <MdPhone className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0 text-white/50" />
                <a href="tel:+50941897341" className="hover:text-white transition-colors">
                  +509 41 89 7341
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-[#2a3a4a]">
        <div className="container py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-white/50">
            <p className="text-center">
              &copy; {currentYear} Les Pages Libres. Tous droits réservés.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 sm:gap-6">
              <Link href={`/${locale}/privacy`} className="hover:text-white transition-colors">
                Politique de confidentialité
              </Link>
              <Link href={`/${locale}/terms`} className="hover:text-white transition-colors">
                Conditions d&apos;utilisation
              </Link>
              <Link href={`/${locale}/privacy#cookies`} className="hover:text-white transition-colors">
                Cookies
              </Link>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 text-center text-[11px] sm:text-xs text-white/50">
            Développé par{' '}
            <a
              href="https://www.helelitsolutions.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#B8860B] hover:text-[#d4a017] transition-colors"
            >
              HELEL IT SOLUTIONS
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

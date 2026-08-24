import type { IconType } from 'react-icons';
import { FaFacebook, FaYoutube, FaTiktok, FaInstagram } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

export interface SocialLink {
  name: string;
  icon: IconType;
  href: string;
  /** True when href is still a placeholder ('#') - no real account yet. */
  isPlaceholder?: boolean;
}

// Shared "follow us" links - used by both the footer and the sidebar's
// social widget, so the two never drift out of sync. No LinkedIn (removed
// per request). X and Facebook link to the real accounts; YouTube, TikTok
// and Instagram are shown (per explicit request) even though those
// accounts don't exist yet - isPlaceholder marks them so callers can
// choose to render them as non-clickable / "coming soon" instead of a
// dead '#' link. Replace the href (and drop isPlaceholder) once each
// account is created.
export const SOCIAL_LINKS: SocialLink[] = [
  { name: 'X', icon: FaXTwitter, href: 'https://x.com/LesPagesLibres' },
  {
    name: 'Facebook',
    icon: FaFacebook,
    href: 'https://www.facebook.com/people/Les-Pages-Libres/61581877379993/',
  },
  { name: 'YouTube', icon: FaYoutube, href: '#', isPlaceholder: true },
  { name: 'TikTok', icon: FaTiktok, href: '#', isPlaceholder: true },
  { name: 'Instagram', icon: FaInstagram, href: '#', isPlaceholder: true },
];

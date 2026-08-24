import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { getSiteSettings } from '@/lib/services/settings-service';
import './styles/globals.css';
import './styles/themes.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const DEFAULT_TITLE = 'Les Pages Libres - Votre source d\'information';
const DEFAULT_DESCRIPTION = 'Votre source de confiance pour l\'actualité locale, internationale et de niche.';

// Settings > General (site_name, meta_title, meta_description,
// meta_keywords, site_url) were already saved to the DB correctly (see
// the note at the top of settings-service.ts) but this file was a static
// `export const metadata` that never read them, so every page kept
// showing the hardcoded "Les Pages Libres" title/description no matter
// what an admin typed into the settings form. generateMetadata() runs
// per-request (this route already has no other dynamic export, so it's
// fine performance-wise - it's one extra single-row DB read) and falls
// back to the original hardcoded copy if a field is left blank.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const siteUrl = (settings.site_url || DEFAULT_SITE_URL).replace(/\/$/, '') || DEFAULT_SITE_URL;
  const siteName = settings.site_name || 'Les Pages Libres';
  const title = settings.meta_title || DEFAULT_TITLE;
  const description = settings.meta_description || settings.site_description || DEFAULT_DESCRIPTION;
  const keywords = settings.meta_keywords
    ? settings.meta_keywords.split(',').map((k) => k.trim()).filter(Boolean)
    : undefined;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description,
    keywords,
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      ],
      apple: '/apple-touch-icon.png',
    },
    manifest: '/site.webmanifest',
    openGraph: {
      type: 'website',
      siteName,
      title,
      description,
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
  };
}

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

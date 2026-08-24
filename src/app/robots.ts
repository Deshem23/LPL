import type { MetadataRoute } from 'next';
import { getSiteSettings } from '@/lib/services/settings-service';

// Next's file-convention robots.txt - served automatically at
// /robots.txt. Same gap as sitemap.ts: the only prior attempt
// (src/lib/seo/robots.ts) wasn't in a location Next recognizes and was
// never imported, so /robots.txt 404'd.
//
// Settings > SEO stores a free-text "Robots.txt personnalisé" field so an
// admin can add extra rules without a code change. Next's typed
// robots.ts convention can only emit structured rules, not arbitrary raw
// text, so this pulls "Disallow: /path" lines out of that field and
// merges them with the built-in defaults below - anything else typed
// into that field (comments, a User-agent block, a Sitemap line) is
// ignored since those are already generated here.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings();
  const baseUrl = (settings.site_url || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

  const customDisallow = (settings.robots_txt || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^Disallow:\s*\S+/i.test(line))
    .map((line) => line.replace(/^Disallow:\s*/i, '').trim());

  // The admin panel's path is deliberately NOT listed here. Its route was
  // just moved off the guessable /admin to a secret slug specifically so
  // it isn't discoverable - listing that path in Disallow would announce
  // its existence to anyone who reads /robots.txt (a well-known way bots
  // and curious visitors find "hidden" admin panels), which defeats the
  // whole point. It's unindexed anyway since it's login-gated.
  const disallow = Array.from(new Set(['/api', ...customDisallow]));

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow,
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

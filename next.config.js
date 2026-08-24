/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost', 'images.unsplash.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  trailingSlash: false,
  env: {
    _next_intl_trailing_slash: 'false',
  },
  experimental: {
    // Disables the client-side Router Cache window for soft (Link click)
    // navigations. Without this, Next.js can reuse a previously-fetched
    // page result for a while (30s for dynamic routes by default) even
    // after the underlying data has changed - which is why clicking a nav
    // link could still show a stale "Category Not Found" while a hard
    // refresh (which always bypasses this cache) correctly loaded the
    // page. Setting both to 0 makes every soft navigation fetch fresh,
    // matching what a hard refresh already did.
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

module.exports = withNextIntl(nextConfig);

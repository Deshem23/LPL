/** @type {import('next-sitemap').IConfig} */
// This file was an empty stub even though package.json's "postbuild" script
// runs `next-sitemap` on every production build - an empty config meant
// that step had nothing to work with and would fail the build. Generates
// public/robots.txt and public/sitemap.xml at build time.
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  exclude: ['/admin', '/admin/*', '/api/*', '/*/admin', '/*/admin/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/*', '/api/*'],
      },
    ],
  },
};

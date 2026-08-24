import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from '@/i18n/config';

// This project uses a custom, hand-written src/middleware.ts instead of
// next-intl's own `createMiddleware()`. Since next-intl 3.22, getRequestConfig
// checks whether ITS OWN middleware set an internal marker on the request; if
// not, it calls notFound() unconditionally — regardless of what this function
// would have returned. (This is what was silently 404ing every /fr/* route:
// "Unable to find `next-intl` locale because the middleware didn't run on
// this request." — see https://next-intl.dev/docs/routing/middleware#unable-to-find-locale)
//
// The documented fix for a custom-middleware setup is to always resolve and
// return a concrete `locale` ourselves here (via the new `requestLocale`
// API), never leaving it undefined — that satisfies next-intl's check and
// prevents it from calling notFound() on our behalf.
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as (typeof locales)[number])) {
    locale = defaultLocale;
  }

  let messages = {};
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    try {
      messages = (await import(`../../messages/${defaultLocale}.json`)).default;
    } catch (e) {
      console.error('Failed to load fallback messages');
    }
  }

  return {
    locale,
    messages,
  };
});

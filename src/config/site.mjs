import {basePath} from '../i18n/locales.mjs';
// Keep sitemap, canonical URLs and social metadata on the deployed site.
const configured = process.env.PUBLIC_SITE_URL || 'https://dracma.club';
const url = new URL(configured);
if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
  throw new Error('PUBLIC_SITE_URL must be an HTTPS origin without a path or credentials');
}
export const SITE_URL = url.origin;
export const LEGACY_LANGUAGES = ['es', 'en', 'fr', 'hi', 'ar', 'ru', 'zh'];
const excluded = new Set(['404', 'preventa', 'success', 'fr', 'hi', 'fr/success', 'hi/success']);
export const isIndexablePath = pathname => !excluded.has(basePath(pathname).replace(/^\/+|\/+$/g, ''));
export const legacyLandingPath = lang => lang === 'es' ? '/preventa/' : ['en','ar','zh','ru','it'].includes(lang) ? `/${lang}/preventa/` : `/${lang}/`;

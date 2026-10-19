// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { SITE_URL, isIndexablePath } from './src/config/site.mjs';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  integrations: [
    react(),
    sitemap({ filter: page => isIndexablePath(new URL(page).pathname) }),
  ],
  vite: {
    optimizeDeps: { include: ['react-dom/client'] },
    plugins: [tailwindcss()],
    define: {
      'process.env.API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || ''),
    },
  },
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en', 'fr', 'hi', 'ar', 'ru', 'zh'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});

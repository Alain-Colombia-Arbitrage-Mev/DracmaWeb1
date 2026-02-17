// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://dracma.org',
  integrations: [
    react(),
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: {
          es: 'es',
          en: 'en',
          fr: 'fr',
          hi: 'hi',
          ar: 'ar',
          ru: 'ru',
          zh: 'zh',
        },
      },
    }),
  ],
  vite: {
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

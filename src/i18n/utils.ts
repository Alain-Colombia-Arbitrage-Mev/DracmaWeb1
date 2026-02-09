import { TRANSLATIONS } from './translations';
import type { Translations } from '../types';

export function getTranslation(lang: string, key: string, fallback?: string): string {
  const t: Translations = TRANSLATIONS[lang] || TRANSLATIONS.es;
  return t[key] || fallback || key;
}

export function getTranslationsForLang(lang: string): Translations {
  return TRANSLATIONS[lang] || TRANSLATIONS.es;
}

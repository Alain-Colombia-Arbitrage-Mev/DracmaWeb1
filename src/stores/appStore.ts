import { atom, computed } from 'nanostores';
import type { AiModalInfo } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { callGeminiAPI } from '../services/geminiService';

// Theme store
export type Theme = 'dark' | 'light';
export const $theme = atom<Theme>('dark');

export function initTheme() {
  if (typeof window === 'undefined') return;
  const saved = localStorage.getItem('dracma-theme') as Theme | null;
  // Default to dark — only use light if user explicitly saved it
  const preferred = saved || 'dark';
  $theme.set(preferred);
  applyThemeClass(preferred);
}

function applyThemeClass(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('theme-light', theme === 'light');
}

export function toggleTheme() {
  const next = $theme.get() === 'dark' ? 'light' : 'dark';
  $theme.set(next);
  applyThemeClass(next);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('dracma-theme', next);
  }
}

// Language store — read initial lang from the page's <html lang> attribute
function getPageLang(): string {
  if (typeof window !== 'undefined' && (window as any).__DRACMA_LANG__) {
    return (window as any).__DRACMA_LANG__;
  }
  if (typeof document !== 'undefined') {
    return document.documentElement.lang || 'es';
  }
  return 'es';
}
export const $currentLang = atom<string>(getPageLang());

export function initLang() {
  if (typeof window === 'undefined') return;
  const pageLang = (window as any).__DRACMA_LANG__ || document.documentElement.lang || 'es';
  if ($currentLang.get() !== pageLang) {
    $currentLang.set(pageLang);
  }
}

export const $translations = computed($currentLang, (lang) => {
  return TRANSLATIONS[lang] || TRANSLATIONS.es;
});

// Helper to get translation
export function getTranslation(key: string, fallback?: string): string {
  const t = $translations.get();
  return t[key] || fallback || key;
}

export function changeLanguage(lang: string) {
  $currentLang.set(lang);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.body.className = document.body.className.replace(/lang-\w+/g, '');
    document.body.classList.add(`lang-${lang}`);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }
}

// AI Modal store
export const $aiModalInfo = atom<AiModalInfo>({
  isOpen: false,
  titleKey: '',
  content: '',
  isLoading: false,
  showCopyButton: false,
});

export async function showAiModal(titleKey: string, prompt?: string, specificContent?: string) {
  $aiModalInfo.set({ isOpen: true, titleKey, content: '', isLoading: true, showCopyButton: false });
  if (specificContent) {
    $aiModalInfo.set({ isOpen: true, titleKey, content: specificContent, isLoading: false, showCopyButton: true });
  } else if (prompt) {
    const lang = $currentLang.get();
    const aiResponse = await callGeminiAPI(prompt, lang, getTranslation);
    $aiModalInfo.set({ isOpen: true, titleKey, content: aiResponse, isLoading: false, showCopyButton: true });
  } else {
    $aiModalInfo.set({
      isOpen: true,
      titleKey,
      content: getTranslation('aiModalError', 'Error generating content.'),
      isLoading: false,
      showCopyButton: false,
    });
  }
}

export function closeAiModal() {
  const current = $aiModalInfo.get();
  $aiModalInfo.set({ ...current, isOpen: false });
}

// Whitepaper Modal store
export const $whitepaperModalOpen = atom<boolean>(false);

export function showWhitepaperModal() {
  $whitepaperModalOpen.set(true);
}

export function closeWhitepaperModal() {
  $whitepaperModalOpen.set(false);
}

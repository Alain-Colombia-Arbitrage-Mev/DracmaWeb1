export const THEME_KEY = 'dracma-theme';
export const isTheme = value => value === 'light' || value === 'dark';
export function readSavedTheme() { try { const saved = localStorage.getItem(THEME_KEY); return isTheme(saved) ? saved : null; } catch { return null; } }
export function resolveTheme(saved, systemDark) { return isTheme(saved) ? saved : 'dark'; }
export function applyTheme(theme) {
 if (typeof document === 'undefined' || !isTheme(theme)) return;
 const root=document.documentElement;
 root.dataset.theme=theme;root.classList.toggle('theme-light',theme==='light');root.style.colorScheme=theme;
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#0b1418':'#f5f6f1');
 document.querySelectorAll('[data-theme-toggle]').forEach(button=>{button.setAttribute('aria-checked',String(theme==='dark'));button.setAttribute('title',theme==='dark'?'Activar tema claro':'Activar tema oscuro');});
}
export function getPreferredTheme() { return resolveTheme(readSavedTheme(),typeof matchMedia==='function'&&matchMedia('(prefers-color-scheme: dark)').matches); }
export function saveTheme(theme) { if(!isTheme(theme))return;applyTheme(theme);try{localStorage.setItem(THEME_KEY,theme);}catch{} }
// Runs before styles paint. Storage is optional; never interpolate its contents into markup.
export const THEME_BOOTSTRAP = `(()=>{let s;try{s=localStorage.getItem('dracma-theme')}catch{}const t=s==='light'||s==='dark'?s:'dark';const r=document.documentElement;r.dataset.theme=t;r.classList.toggle('theme-light',t==='light');r.style.colorScheme=t;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',t==='dark'?'#0b1418':'#f5f6f1')})();`;

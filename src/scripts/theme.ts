import {THEME_KEY,applyTheme,getPreferredTheme,readSavedTheme,resolveTheme,saveTheme} from '../lib/theme.mjs';
let explicitChoice=readSavedTheme();
applyTheme(getPreferredTheme());
document.querySelectorAll('[data-theme-toggle]').forEach(button=>button.addEventListener('click',()=>{explicitChoice=document.documentElement.dataset.theme==='dark'?'light':'dark';saveTheme(explicitChoice);}));
const system=window.matchMedia('(prefers-color-scheme: dark)');
system.addEventListener('change',event=>{if(!explicitChoice&&!readSavedTheme())applyTheme(resolveTheme(null,event.matches));});
window.addEventListener('storage',event=>{if(event.key===THEME_KEY||event.key===null){explicitChoice=readSavedTheme();applyTheme(resolveTheme(explicitChoice,system.matches));}});

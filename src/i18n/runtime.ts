import {localeFor} from './locales.mjs';
export const runtimeLocale=typeof document==='undefined'?'es':localeFor(location.pathname);
const catalogs=import.meta.glob('./catalogs/*.json',{import:'default'});
export const runtimeDictionary:Record<string,string>=runtimeLocale==='es'?{}:await catalogs[`./catalogs/${runtimeLocale}.json`]() as Record<string,string>;

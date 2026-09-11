// Resolves the content bundle for the requested language.
// Order: ?lang=xx → <html lang> → 'en'. Unknown languages fall back to English.
import en from './content.en.js';

const BUNDLES = { en };
// Future: import es from './content.es.js'; BUNDLES.es = es;

export function resolveLang(search = '', htmlLang = 'en') {
  const fromQuery = new URLSearchParams(search).get('lang');
  const candidate = (fromQuery || htmlLang || 'en').toLowerCase().slice(0, 2);
  return BUNDLES[candidate] ? candidate : 'en';
}

export function getContent(lang) {
  return BUNDLES[lang] || en;
}

export { BUNDLES };

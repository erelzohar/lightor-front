import i18n, { type BackendModule, type ReadCallback, type ResourceKey } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { readInlineConfig } from '../services/edgeShell';

// Tests keep every language at hand, so text is there the moment a component
// draws (as before LT-603). A build reads `import.meta.env.MODE` as a constant
// and drops these imports: a site downloads its languages below instead.
import enTranslation from './locales/en/translation.json';
import heTranslation from './locales/he/translation.json';
import arTranslation from './locales/ar/translation.json';
import frTranslation from './locales/fr/translation.json';
import esTranslation from './locales/es/translation.json';

export const LANGUAGES = ['en', 'he', 'ar', 'fr', 'es'] as const;

const TESTING = import.meta.env.MODE === 'test';

/**
 * LT-603: each language is its own file, downloaded when a page speaks it:
 * the site's own language (and Hebrew, the fallback below), a language the
 * visitor picks. Every site used to carry all five (160 KB of its script).
 */
const LOADERS: Record<string, () => Promise<{ default: ResourceKey }>> = {
  en: () => import('./locales/en/translation.json'),
  he: () => import('./locales/he/translation.json'),
  ar: () => import('./locales/ar/translation.json'),
  fr: () => import('./locales/fr/translation.json'),
  es: () => import('./locales/es/translation.json'),
};

const lazyLanguages: BackendModule = {
  type: 'backend',
  init: () => undefined,
  read: (language: string, _namespace: string, callback: ReadCallback) => {
    const load = LOADERS[language];
    if (!load) {
      callback(null, {});
      return;
    }
    load().then((mod) => callback(null, mod.default), (err: unknown) => callback(err as Error, null));
  },
};

/**
 * A live site's page names its language in the config the edge inlined
 * (LT-194): start in it, and download no other language first (the site
 * switches to it the moment the config is read anyway). A preview, a page
 * with no inline config, keeps the visitor's browser language until its
 * config arrives.
 */
const siteLanguage = (): string | undefined => {
  if (TESTING || typeof document === 'undefined') return undefined;
  try {
    const lang = (readInlineConfig(document, window.location.hostname)?.config as { defaultLanguage?: unknown } | undefined)?.defaultLanguage;
    return typeof lang === 'string' && (LANGUAGES as readonly string[]).includes(lang) ? lang : undefined;
  } catch {
    return undefined;
  }
};

if (!TESTING) i18n.use(lazyLanguages);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    ...(TESTING
      ? {
          resources: {
            en: { translation: enTranslation },
            he: { translation: heTranslation },
            ar: { translation: arTranslation },
            fr: { translation: frTranslation },
            es: { translation: esTranslation },
          },
        }
      : {}),
    lng: siteLanguage(),
    fallbackLng: 'he',
    // LT-408: a visitor language the sites do not speak (a Russian browser)
    // falls back to Hebrew whole - it used to stay "ru", so a page shown
    // before the site's own language arrives (the not-live page, not found)
    // read Hebrew laid out left to right.
    supportedLngs: [...LANGUAGES],
    load: 'languageOnly', // We only use 'en', 'he', etc.
    interpolation: {
      escapeValue: false,
    },
    // LT-603: the page waits for its language in LanguageProvider (no
    // Suspense): a language switched to later shows once it has arrived.
    react: { useSuspense: false },
    detection: {
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

export default i18n;

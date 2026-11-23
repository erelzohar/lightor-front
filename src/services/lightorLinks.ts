/**
 * LT-710: a link that leaves a business's site for one of Lightor's own apps
 * says which language the visitor is reading the site in right now, so the
 * wizard (or the dashboard) opens in it instead of Hebrew. Other parameters
 * stay; `lang` is added beside them.
 */
/** The five languages (i18n/config's LANGUAGES, without loading i18n here). */
const LANGUAGES = ['en', 'he', 'ar', 'fr', 'es'] as const;

const withLanguage = (base: string, language: string, params: Record<string, string> = {}): string => {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  if ((LANGUAGES as readonly string[]).includes(language)) url.searchParams.set('lang', language);
  return url.toString();
};

export const wizardLink = (language: string, params?: Record<string, string>): string =>
  withLanguage('https://register.lightor.app/', language, params);

export const dashboardLink = (language: string): string =>
  withLanguage('https://dashboard.lightor.app/', language);

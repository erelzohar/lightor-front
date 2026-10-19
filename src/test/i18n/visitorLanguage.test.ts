import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * LT-408 — before a site's own language arrives (the not-live page, not
 * found), the visitor's browser language rules. One the sites do not speak
 * falls back to Hebrew whole: the texts and the language the direction is
 * taken from.
 */
const withBrowser = async (languages: string[]) => {
  vi.resetModules();
  localStorage.clear();
  Object.defineProperty(window.navigator, 'languages', { value: languages, configurable: true });
  Object.defineProperty(window.navigator, 'language', { value: languages[0], configurable: true });
  const { default: i18n } = await import('../../i18n/config');
  return i18n;
};

describe("the visitor's language before the site's", () => {
  afterEach(() => localStorage.clear());

  it('a browser language the sites do not speak is Hebrew, not itself', async () => {
    const i18n = await withBrowser(['ru-RU', 'ru']);
    expect(i18n.language).toBe('he');
    expect(i18n.t('inactive.title')).toBe('האתר עוד לא פעיל');
  });

  // LanguageContext reads the part before the region ("he-IL" -> "he").
  const used = (i18n: { language: string }) => i18n.language.split('-')[0];

  it('a spoken one is used, region or not', async () => {
    expect(used(await withBrowser(['en-US', 'en']))).toBe('en');
    expect(used(await withBrowser(['ar']))).toBe('ar');
    expect(used(await withBrowser(['ru-RU', 'fr-FR']))).toBe('fr');
  });
});

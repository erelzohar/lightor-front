import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * LT-408 — before a site's own language arrives (the not-live page, not
 * found), the visitor's browser language rules. One the sites do not speak
 * falls back whole: the texts and the language the direction is taken from.
 * LT-710: to English, except in Israel, where it stays Hebrew.
 */
const withBrowser = async (languages: string[], timeZone = 'Asia/Jerusalem') => {
  vi.resetModules();
  vi.restoreAllMocks();
  // The shell as index.html ships it, before the site's language is known.
  document.documentElement.lang = 'he';
  document.documentElement.dir = 'rtl';
  const real = Intl.DateTimeFormat.prototype.resolvedOptions;
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(function (this: Intl.DateTimeFormat) {
    return { ...real.call(this), timeZone };
  });
  localStorage.clear();
  Object.defineProperty(window.navigator, 'languages', { value: languages, configurable: true });
  Object.defineProperty(window.navigator, 'language', { value: languages[0], configurable: true });
  const { default: i18n } = await import('../../i18n/config');
  return i18n;
};

describe("the visitor's language before the site's", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('in Israel, a browser language the sites do not speak is Hebrew, not itself', async () => {
    const i18n = await withBrowser(['ru-RU', 'ru'], 'Asia/Jerusalem');
    expect(i18n.language).toBe('he');
    expect(i18n.t('inactive.title')).toBe('האתר עוד לא פעיל');
  });

  it('elsewhere, a browser language the sites do not speak is English (LT-710)', async () => {
    for (const zone of ['Europe/Berlin', 'America/New_York', 'UTC']) {
      const i18n = await withBrowser(['de-DE', 'de'], zone);
      expect(i18n.language).toBe('en');
      expect(i18n.dir()).toBe('ltr');
      expect(i18n.t('inactive.title')).toBe("This site isn't live yet");
    }
  });

  // LanguageContext reads the part before the region ("he-IL" -> "he").
  const used = (i18n: { language: string }) => i18n.language.split('-')[0];

  it('a spoken one is used, region or not', async () => {
    expect(used(await withBrowser(['en-US', 'en']))).toBe('en');
    expect(used(await withBrowser(['ar']))).toBe('ar');
    expect(used(await withBrowser(['ru-RU', 'fr-FR']))).toBe('fr');
  });
});

describe('a text missing in one language (LT-710)', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('Arabic, French and Spanish take it from English; English and Hebrew from Hebrew', async () => {
    const i18n = await withBrowser(['he-IL']);
    i18n.addResource('he', 'translation', 'lt710.onlyHe', 'רק בעברית');
    i18n.addResource('en', 'translation', 'lt710.enAndHe', 'In English');
    i18n.addResource('he', 'translation', 'lt710.enAndHe', 'בעברית');
    for (const lng of ['ar', 'fr', 'es']) {
      expect(i18n.t('lt710.enAndHe', { lng })).toBe('In English');
    }
    expect(i18n.t('lt710.onlyHe', { lng: 'en' })).toBe('רק בעברית');
    expect(i18n.t('lt710.enAndHe', { lng: 'he' })).toBe('בעברית');
  });
});

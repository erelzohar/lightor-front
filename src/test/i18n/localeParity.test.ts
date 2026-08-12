import { describe, it, expect } from 'vitest';
import en from '../../i18n/locales/en/translation.json';
import he from '../../i18n/locales/he/translation.json';
import ar from '../../i18n/locales/ar/translation.json';
import fr from '../../i18n/locales/fr/translation.json';
import es from '../../i18n/locales/es/translation.json';

type Tree = { [key: string]: unknown };

const flatten = (tree: Tree, prefix = ''): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flatten(value as Tree, path));
    } else {
      acc[path] = String(value);
    }
    return acc;
  }, {});

const locales = {
  he: flatten(he as Tree),
  en: flatten(en as Tree),
  ar: flatten(ar as Tree),
  fr: flatten(fr as Tree),
  es: flatten(es as Tree),
};

type Locale = keyof typeof locales;
const languages = Object.keys(locales) as Locale[];
const reference: Locale = 'he';

/**
 * A booking site is the business's shop window, and every visitor sees it in
 * their own language. i18next falls back to Hebrew without complaining, so a
 * key added in one language and forgotten in the others shows Hebrew inside
 * an Arabic or French page — visible to that business's customers, invisible
 * to us, and reported by nobody.
 */
describe('booking site translations', () => {
  it('ships the five advertised languages', () => {
    expect([...languages].sort()).toEqual(['ar', 'en', 'es', 'fr', 'he']);
  });

  it.each(languages.filter((l) => l !== reference))('%s has no missing keys', (lang) => {
    const missing = Object.keys(locales[reference]).filter((key) => !(key in locales[lang]));
    expect(missing).toEqual([]);
  });

  it.each(languages.filter((l) => l !== reference))('%s has no orphan keys', (lang) => {
    const orphans = Object.keys(locales[lang]).filter((key) => !(key in locales[reference]));
    expect(orphans).toEqual([]);
  });

  it.each(languages)('%s has no blank strings', (lang) => {
    const blank = Object.entries(locales[lang])
      .filter(([, value]) => value.trim() === '')
      .map(([key]) => key);
    expect(blank).toEqual([]);
  });

  it('keeps interpolation placeholders identical across languages', () => {
    const placeholders = (value: string) => (value.match(/\{\{\s*[\w.]+\s*\}\}/g) ?? []).sort();

    const mismatched: string[] = [];
    for (const key of Object.keys(locales[reference])) {
      const expected = placeholders(locales[reference][key]);
      for (const lang of languages) {
        if (lang === reference) continue;
        if (JSON.stringify(placeholders(locales[lang][key] ?? '')) !== JSON.stringify(expected)) {
          mismatched.push(`${lang}:${key}`);
        }
      }
    }
    expect(mismatched).toEqual([]);
  });
});

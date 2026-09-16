import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * LT-169 — every literal `t('key')` in the app resolves to a string in all five
 * locales. The contact modal shipped for months showing `contact.modal.call.title`
 * because the component used dotted keys and the locales underscore ones; a call
 * that passes `defaultValue` is exempt (it renders that instead of the key).
 */
const LOCALES = ['he', 'en', 'ar', 'es', 'fr'] as const;
const ROOT = join(__dirname, '..', '..');

const load = (l: string) => JSON.parse(readFileSync(join(ROOT, 'i18n', 'locales', l, 'translation.json'), 'utf8').replace(/^﻿/, ''));

const resolves = (dict: unknown, key: string): boolean => {
  let cur: unknown = dict;
  for (const part of key.split('.')) {
    if (!cur || typeof cur !== 'object' || !(part in (cur as Record<string, unknown>))) return false;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === 'string';
};

const sources = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (!p.includes(`${join('src', 'test')}`) && name !== 'locales') sources(p, out); }
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
};

// t('key') or t("key") — with the options object, if any, captured so a defaultValue can exempt it.
const CALL = /\bt\(\s*(['"])([A-Za-z0-9_.-]+)\1\s*(,\s*\{[^}]*\})?/g;

describe('translation keys', () => {
  it('every literal key without a defaultValue resolves in every locale', () => {
    const dicts = Object.fromEntries(LOCALES.map((l) => [l, load(l)]));
    const broken: string[] = [];
    for (const file of sources(ROOT)) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(CALL)) {
        const [, , key, opts] = m;
        if (opts && /defaultValue/.test(opts)) continue;
        const missing = LOCALES.filter((l) => !resolves(dicts[l], key));
        if (missing.length) broken.push(`${key} (${missing.join(',')}) in ${file.slice(ROOT.length + 1)}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('the five locales define the same key set', () => {
    const flat = (o: unknown, prefix = ''): string[] =>
      Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
    const he = new Set(flat(load('he')));
    for (const l of LOCALES.slice(1)) {
      const keys = new Set(flat(load(l)));
      const onlyHe = [...he].filter((k) => !keys.has(k));
      const onlyL = [...keys].filter((k) => !he.has(k));
      expect({ locale: l, missing: onlyHe, extra: onlyL }).toEqual({ locale: l, missing: [], extra: [] });
    }
  });
});

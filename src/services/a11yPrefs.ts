/**
 * LT-346: the visitor's accessibility-menu choices (larger text, high
 * contrast, highlighted links, a readable font, wider spacing, no motion).
 *
 * Each one is a class on <html> that index.css acts on, so nothing in the
 * page has to know about them — except motion, which also lives in JS
 * (Vanta, framer-motion, the 3D Lighty, the testimonials rotation): those
 * ask `reducedMotion()` (services/generateReveal) or the `useStill` hook.
 *
 * Kept in localStorage, so a visitor's choice holds on the next visit. Every
 * tenant is its own origin (`<sub>.lightor.app`), so the choice is per site.
 * Storage can be missing or throw (private mode, blocked site data): the
 * menu then simply works for this visit.
 */

export type TextStep = 0 | 1 | 2 | 3;

export interface A11yPrefs {
  /** 0 = the site's own size; 1-3 = larger steps (see TEXT_SCALE). */
  text: TextStep;
  contrast: boolean;
  links: boolean;
  font: boolean;
  spacing: boolean;
  still: boolean;
}

export const DEFAULT_PREFS: A11yPrefs = { text: 0, contrast: false, links: false, font: false, spacing: false, still: false };

/** Root font size per step; the site is sized in rem, so everything follows. */
export const TEXT_SCALE: Record<TextStep, number> = { 0: 100, 1: 115, 2: 130, 3: 150 };

const KEY = 'lt-a11y';

const BOOL_KEYS = ['contrast', 'links', 'font', 'spacing', 'still'] as const;

const parse = (raw: string | null): A11yPrefs => {
  if (!raw) return DEFAULT_PREFS;
  try {
    const json = JSON.parse(raw) as Partial<Record<keyof A11yPrefs, unknown>>;
    const text = [0, 1, 2, 3].includes(json.text as number) ? (json.text as TextStep) : 0;
    const prefs: A11yPrefs = { ...DEFAULT_PREFS, text };
    for (const k of BOOL_KEYS) prefs[k] = json[k] === true;
    return prefs;
  } catch {
    return DEFAULT_PREFS;
  }
};

const read = (): A11yPrefs => {
  try {
    return parse(window.localStorage.getItem(KEY));
  } catch {
    return DEFAULT_PREFS;
  }
};

let prefs: A11yPrefs = typeof window === 'undefined' ? DEFAULT_PREFS : read();
/** False on a site whose owner hid the menu: no way to undo a choice there, so none applies. */
let enabled = true;
const listeners = new Set<() => void>();

/** True when any choice differs from the site as its owner made it. */
export const isCustomised = (p: A11yPrefs): boolean =>
  p.text !== 0 || BOOL_KEYS.some((k) => p[k]);

/** The classes index.css styles; one per choice that is on. */
export const classesFor = (p: A11yPrefs): string[] => [
  ...(p.text ? [`a11y-text-${p.text}`] : []),
  ...BOOL_KEYS.filter((k) => p[k]).map((k) => `a11y-${k}`),
];

const ALL_CLASSES = ['a11y-text-1', 'a11y-text-2', 'a11y-text-3', ...BOOL_KEYS.map((k) => `a11y-${k}`)];

export const applyA11yPrefs = (p: A11yPrefs = getA11yPrefs(), root: HTMLElement = document.documentElement): void => {
  const on = new Set(classesFor(p));
  for (const c of ALL_CLASSES) root.classList.toggle(c, on.has(c));
};

/** The choices in force: the visitor's, unless this site's owner hid the menu. */
export const getA11yPrefs = (): A11yPrefs => (enabled ? prefs : DEFAULT_PREFS);

/** The site's owner shows or hides the menu (WebConfig `accessibility.widgetHidden`). */
export const setA11yMenuEnabled = (on: boolean): void => {
  if (enabled === on) return;
  enabled = on;
  applyA11yPrefs();
  listeners.forEach((fn) => fn());
};

export const subscribeA11yPrefs = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

const commit = (next: A11yPrefs) => {
  prefs = next;
  try {
    if (isCustomised(next)) window.localStorage.setItem(KEY, JSON.stringify(next));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the choice lasts for this visit only.
  }
  applyA11yPrefs();
  listeners.forEach((fn) => fn());
};

export const setA11yPrefs = (patch: Partial<A11yPrefs>): void => commit({ ...prefs, ...patch });

export const resetA11yPrefs = (): void => commit(DEFAULT_PREFS);

/** For tests: forget the module's copy and read storage again. */
export const reloadA11yPrefs = (): void => { prefs = read(); enabled = true; applyA11yPrefs(); listeners.forEach((fn) => fn()); };

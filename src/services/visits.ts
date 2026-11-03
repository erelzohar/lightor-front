import globals from './globals';

/**
 * LT-569: the site tells Lightor a visitor came in, or opened a product, so
 * the owner sees the visits (a leads site, for now) and the most viewed
 * products. A visit is the visitor coming in; the pages they move through,
 * or a return within half an hour, are the same visit - Erel: one visit, not
 * every page. Nothing about the visitor is sent or kept: the device holds
 * only when it last counted (no cookie, no id), the server only numbers.
 * Never from a preview or the editor (a frame), nor from a robot browser.
 */

export const VISIT_GAP_MS = 30 * 60 * 1000;
const VISIT_KEY = 'lt.visit.';
const VIEWS_KEY = 'lt.viewed.';

/** Counted this page load when the device keeps nothing (a private window that refuses storage). */
const counted = new Set<string>();

export const countsHere = (win: Pick<Window, 'self' | 'top' | 'navigator'> = window): boolean =>
  win.self === win.top && !win.navigator.webdriver;

const read = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string): boolean => {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const send = (subDomain: string, body: Record<string, string>): void => {
  try {
    void fetch(`${globals.visitsUrl}/${encodeURIComponent(subDomain)}`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => undefined);
  } catch {
    // A visit not counted is never the visitor's problem.
  }
};

/**
 * A page of the site is open now: the first in half an hour starts a visit.
 * Each page moves the half hour on, so browsing on stays one visit.
 */
export const noteVisit = (subDomain: string, now = Date.now()): boolean => {
  const key = VISIT_KEY + subDomain;
  const last = Number(read(key));
  const fresh = !(last > 0 && now - last < VISIT_GAP_MS);
  const kept = write(key, String(now));
  if (!fresh || (!kept && counted.has(key))) return false;
  counted.add(key);
  send(subDomain, {});
  return true;
};

/** A product's page was opened: once per product per half hour. */
export const noteProductView = (subDomain: string, productId: string, now = Date.now()): boolean => {
  const key = VIEWS_KEY + subDomain;
  let seen: Record<string, number> = {};
  try {
    seen = JSON.parse(read(key) ?? '{}') as Record<string, number>;
  } catch {
    seen = {};
  }
  const last = seen[productId];
  if (last > 0 && now - last < VISIT_GAP_MS) return false;
  // Only the products of the last half hour stay on the device.
  const kept = Object.fromEntries(Object.entries(seen).filter(([, at]) => now - at < VISIT_GAP_MS));
  kept[productId] = now;
  const stored = write(key, JSON.stringify(kept));
  const once = `${key}|${productId}`;
  if (!stored && counted.has(once)) return false;
  counted.add(once);
  send(subDomain, { product: productId });
  return true;
};

/** For tests. */
export const resetVisitMemory = (): void => counted.clear();

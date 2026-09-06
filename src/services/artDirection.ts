import type { SiteJitter } from './seed';

/**
 * LT-131: per-section art direction, seeded per site. What still made
 * generated pages read alike after four layers of variants was the rhythm
 * every section shared — the same vertical padding, the same heading size,
 * then content. These helpers give each section of a vibe site its own
 * heading scale and breathing room, pick one section to invert into a dark
 * color block, and place a photo interlude between sections.
 */
export type HeadingScale = 'giant' | 'normal' | 'micro';
export type Spacing = 'tight' | 'normal' | 'huge';

// Fixed draw index per section key, so a section keeps its art direction
// wherever the seeded order puts it.
const DRAW_INDEX: Record<string, number> = {
  about: 0, services: 1, portfolio: 2, testimonials: 3, schedule: 4, faq: 5, contact: 6,
};

export const scaleOf = (key: string, jitter: Pick<SiteJitter, 'sectionScales'>): HeadingScale | undefined => {
  const i = DRAW_INDEX[key];
  if (i === undefined) return undefined;
  const u = jitter.sectionScales[i] ?? 0.5;
  return u < 0.3 ? 'giant' : u < 0.78 ? 'normal' : 'micro';
};

export const spacingOf = (key: string, jitter: Pick<SiteJitter, 'sectionSpacings'>): Spacing => {
  const i = DRAW_INDEX[key];
  if (i === undefined) return 'normal';
  const u = jitter.sectionSpacings[i] ?? 0.5;
  return u < 0.22 ? 'tight' : u > 0.8 ? 'huge' : 'normal';
};

export const SPACING_CLASS: Record<Spacing, string> = {
  tight: '[&>section]:!py-10',
  normal: '',
  huge: '[&>section]:!py-40 lg:[&>section]:!py-56',
};

/** One middle section becomes a dark color block on a light page. */
export const pickInvert = (keys: string[], draw: number, excluded: Set<string>): string | null => {
  const pool = keys.filter((k) => ['about', 'services', 'portfolio', 'testimonials', 'faq'].includes(k) && !excluded.has(k));
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(draw * pool.length))];
};

/** Insertion index for the photo interlude: after one of the middle sections. */
export const pickInterludeSlot = (keys: string[], draw: number): number | null => {
  const slots = keys.map((k, i) => (['about', 'services', 'portfolio', 'testimonials'].includes(k) ? i + 1 : -1)).filter((i) => i !== -1);
  if (!slots.length) return null;
  return slots[Math.min(slots.length - 1, Math.floor(draw * slots.length))];
};

/**
 * Timing for the "generating" cascade a preview plays when the register wizard
 * posts a fresh config (see components/GenerateReveal). Kept out of the
 * component file so fast refresh stays happy and the numbers are testable.
 */

import { getA11yPrefs } from './a11yPrefs';

/** Seconds before section `index` lands. Front-loaded: the fold matters most. */
export const generateDelay = (index: number): number => Math.min(index, 8) * 0.32 + 0.15;

/** The device asks for less motion (an OS setting). */
export const systemReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Less motion: the device asks for it, or the visitor chose "stop animations" in the site's accessibility menu (LT-346). */
export const reducedMotion = (): boolean => systemReducedMotion() || getA11yPrefs().still;

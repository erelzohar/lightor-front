/**
 * Timing for the "generating" cascade a preview plays when the register wizard
 * posts a fresh config (see components/GenerateReveal). Kept out of the
 * component file so fast refresh stays happy and the numbers are testable.
 */

/** Seconds before section `index` lands. Front-loaded: the fold matters most. */
export const generateDelay = (index: number): number => Math.min(index, 8) * 0.32 + 0.15;

export const reducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

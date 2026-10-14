import type { RevealStyle } from '../models/DesignConfig';

interface RevealSet { container: Record<string, unknown>; item: Record<string, unknown> }

/**
 * LT-126: per-site motion profile for the section reveals. 'rise' (and an
 * unset style) returns the component's own legacy variants (completed with
 * the resting pose, LT-325 — same motion); the other profiles change how
 * every section enters — fade, slide from the reading start, or zoom.
 */
/**
 * LT-325: every state names every axis a profile moves. Switching the style
 * on an open page swaps the variants under elements that already took a
 * pose; a profile silent on an axis left the old pose on it — after
 * slide → rise, About and Features stayed 48px to the side, their text cut
 * off at the page's edge. Unnamed axes are the resting pose.
 */
const REST = { x: 0, y: 0, scale: 1 };
const settle = (variant: unknown): unknown =>
  variant && typeof variant === 'object' && !Array.isArray(variant) ? { ...REST, ...(variant as Record<string, unknown>) } : variant;
const settleAll = (variants: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(variants).map(([state, v]) => [state, settle(v)]));
const complete = (set: RevealSet): RevealSet => ({ container: settleAll(set.container), item: settleAll(set.item) });

export const revealVariants = (style: RevealStyle | undefined, legacy: RevealSet): RevealSet => complete(pick(style, legacy));

const pick = (style: RevealStyle | undefined, legacy: RevealSet): RevealSet => {
  if (!style || style === 'rise') return legacy;
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  switch (style) {
    case 'fade':
      return {
        container: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } },
        item: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.9, ease: 'easeOut' } } },
      };
    case 'slide':
      return {
        container: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } },
        item: { hidden: { x: rtl ? 48 : -48, opacity: 0 }, visible: { x: 0, opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } } },
      };
    case 'zoom':
      return {
        container: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } },
        item: { hidden: { scale: 0.9, opacity: 0 }, visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 140, damping: 18 } } },
      };
  }
};

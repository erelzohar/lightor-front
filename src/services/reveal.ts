import type { RevealStyle } from '../models/DesignConfig';

interface RevealSet { container: Record<string, unknown>; item: Record<string, unknown> }

/**
 * LT-126: per-site motion profile for the section reveals. 'rise' (and an
 * unset style) returns the component's own legacy variants untouched, so
 * legacy sites animate byte-identically; the other profiles change how
 * every section enters — fade, slide from the reading start, or zoom.
 */
export const revealVariants = (style: RevealStyle | undefined, legacy: RevealSet): RevealSet => {
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

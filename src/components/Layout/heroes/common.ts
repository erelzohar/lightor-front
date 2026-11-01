import { useEffect } from 'react';

// LT-445: the hero picture is the page's largest paint (LCP): fetched first,
// never lazily. Lowercase, as React 18 passes an attribute it does not know.
export const HERO_IMAGE = { fetchpriority: 'high', loading: 'eager' } as Record<string, string>;

export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

/** An older device: it gets a lighter version of the same effect, not a broken one. */
export const lowEnd = (): boolean =>
  typeof navigator !== 'undefined' && ((navigator.hardwareConcurrency ?? 8) <= 4 || ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 2);

/** Runs `draw` once per frame while the page scrolls (and once at the start); nothing otherwise. */
export const useScrollFrame = (enabled: boolean, draw: () => void): void => {
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; draw(); });
    };
    draw();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [enabled, draw]);
};

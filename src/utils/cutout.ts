import { useEffect, useState } from 'react';

/**
 * LT-317: is this image a cut-out — a round logo, a sticker — rather than a
 * photo? Its four corners are see-through. Such an image must not sit in a
 * square box with a box shadow (the shadow draws the box the logo is not), so
 * the hero shows it whole, with a shadow that follows its own outline.
 *
 * Read from a separate copy fetched with CORS — never the image on the page:
 * an `<img crossOrigin>` whose response lacks the header fails to load at
 * all, and a plain one taints the canvas. If the copy cannot be read (no
 * CORS, a cached response for another origin, no canvas in tests), the
 * answer is "a photo" and nothing changes.
 */
const cache = new Map<string, Promise<boolean>>();
const SIZE = 32;
const CLEAR = 8; // alpha at or below this is see-through

export const isCutout = (src: string | undefined | null): Promise<boolean> => {
  if (!src || typeof Image === 'undefined' || typeof document === 'undefined') return Promise.resolve(false);
  const known = cache.get(src);
  if (known) return known;
  const answer = new Promise<boolean>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(false);
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
        const alpha = (x: number, y: number) => data[(y * SIZE + x) * 4 + 3];
        const last = SIZE - 1;
        resolve([alpha(0, 0), alpha(last, 0), alpha(0, last), alpha(last, last)].every((a) => a <= CLEAR));
      } catch {
        resolve(false); // a tainted canvas: no answer, so a photo
      }
    };
    img.onerror = () => resolve(false);
    img.src = src;
  });
  cache.set(src, answer);
  return answer;
};

/** `isCutout` for a component: false until the answer arrives. */
export const useCutout = (src: string | undefined | null): boolean => {
  const [state, setState] = useState<{ src: string | null | undefined; cutout: boolean }>({ src, cutout: false });
  useEffect(() => {
    let live = true;
    isCutout(src).then((cutout) => { if (live) setState({ src, cutout }); });
    return () => { live = false; };
  }, [src]);
  return state.src === src && state.cutout;
};

/** How a cut-out shows: whole, no box, a shadow along its own outline. */
export const CUTOUT_CLASS = 'object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.18)]';

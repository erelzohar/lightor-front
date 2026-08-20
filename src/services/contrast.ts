/**
 * WCAG contrast guardrails (LT-060).
 *
 * Palettes arrive from the AI wizard or the owner's color picker with no
 * contrast validation, so "primary" can land invisibly close to the
 * background it is drawn on. These helpers derive a *readable* variant of a
 * color against a given backdrop — same hue and saturation, lightness walked
 * just far enough to clear a target contrast ratio — so text roles stay
 * legible while decorative fills keep the palette's exact color.
 *
 * Everything is pure and deterministic: the same palette always derives the
 * same corrections, on every load and in previews.
 */

export interface Rgb { r: number; g: number; b: number; }

export const hexToRgb = (hex: string): Rgb | null => {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
};

export const rgbToHex = ({ r, g, b }: Rgb): string =>
  '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

/** "255 128 0" — the triplet form the Tailwind rgb(var(--x) / a) pattern eats. */
export const rgbToTriplet = ({ r, g, b }: Rgb): string => `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;

const srgbToLinear = (v: number): number => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

export const relativeLuminance = ({ r, g, b }: Rgb): number =>
  0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);

/** WCAG 2.x contrast ratio, 1..21. Invalid hex counts as mid-gray. */
export const contrastRatio = (hexA: string, hexB: string): number => {
  const a = hexToRgb(hexA) ?? { r: 128, g: 128, b: 128 };
  const b = hexToRgb(hexB) ?? { r: 128, g: 128, b: 128 };
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

interface Hsl { h: number; s: number; l: number; }

const rgbToHsl = ({ r, g, b }: Rgb): Hsl => {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h, s, l };
};

const hue2rgb = (p: number, q: number, t: number): number => {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
};

const hslToRgb = ({ h, s, l }: Hsl): Rgb => {
  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  };
};

/**
 * Return `fg` unchanged when it already clears `target` contrast against
 * `bg`; otherwise walk its HSL lightness away from the background's
 * luminance — binary search, hue and saturation preserved — until it does.
 * If even the extreme (near-white / near-black at the same hue) cannot reach
 * the target, the extreme is returned: the most readable version that still
 * belongs to the palette's hue.
 */
export const ensureReadable = (fg: string, bg: string, target = 4.5): string => {
  if (contrastRatio(fg, bg) >= target) return fg;
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  if (!fgRgb || !bgRgb) return fg;

  const { h, s } = rgbToHsl(fgRgb);
  const lightenAgainst = relativeLuminance(bgRgb) < 0.5; // dark bg → push fg lighter
  const ratioAt = (l: number): number => {
    const candidate = rgbToHex(hslToRgb({ h, s, l }));
    return contrastRatio(candidate, bg);
  };

  // The extreme of the search direction; bail to it when even that fails.
  const extreme = lightenAgainst ? 1 : 0;
  if (ratioAt(extreme) < target) return rgbToHex(hslToRgb({ h, s, l: extreme }));

  // Binary search the smallest lightness shift that clears the target —
  // ratio is monotonic in L for fixed hue/saturation.
  let lo = rgbToHsl(fgRgb).l;
  let hi = extreme;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (ratioAt(mid) >= target) hi = mid;
    else lo = mid;
  }
  return rgbToHex(hslToRgb({ h, s, l: hi }));
};

/**
 * Text color for content sitting ON a `bg`-filled control (solid buttons):
 * whichever of the candidates reads better. White wins ties so branded
 * buttons keep the conventional light-on-color look whenever it's legible.
 */
export const bestTextOn = (bg: string, candidates: string[] = ['#ffffff', '#111827']): string => {
  let best = candidates[0];
  let bestRatio = -1;
  for (const c of candidates) {
    const r = contrastRatio(c, bg);
    if (r > bestRatio + 0.001) {
      best = c;
      bestRatio = r;
    }
  }
  return best;
};

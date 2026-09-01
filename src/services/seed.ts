/**
 * Seeded per-site jitter (LT-053).
 *
 * Two businesses that picked the same style preset should still not get
 * pixel-identical sites. Everything here is derived deterministically from
 * the site's subdomain, so a given site renders the same on every visit and
 * on both server previews and the public site — no hydration flicker, no
 * per-render randomness — while two different sites land on different values.
 *
 * Only NON-SEMANTIC presentation details belong here: background phases,
 * animation timing, which side a column sits on. Nothing that changes
 * meaning, copy, branding, or usability may ever be seeded.
 */

// xmur3 string hash — spreads short, similar subdomains ("dana", "dana2")
// into well-separated 32-bit seeds.
const hashString = (str: string): number => {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
};

// mulberry32 — tiny, fast, deterministic PRNG. Quality is more than enough
// for cosmetic jitter.
const mulberry32 = (seed: number) => {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export interface SiteJitter {
  /** Per-blob offsets in [-10, 10] percent, applied to the hero's three
   *  radial-gradient layers so the color wash sits differently per site. */
  blobOffsets: [number, number, number];
  /** Seed for the hero particle field (positions/sizes derived from it). */
  particleSeed: number;
  /** Hero image float period in seconds, 4.5–6.5 (was a fixed 5). */
  floatDuration: number;
  /** Start index into the masonry aspect-ratio cycle (0–2). */
  masonryPhase: number;
  /** In the about 'split' layout, put the visit card on the other side. */
  flipAboutSplit: boolean;
  /** Mirror the section-divider shapes horizontally. */
  mirrorDividers: boolean;
  /** LT-113: template vibes swap between their two poster hero compositions
   *  (poster-split ↔ poster-statement), so two same-vibe businesses open on
   *  structurally different folds. */
  posterAlt: boolean;
  /** Mirror the poster-split hero columns (image side). */
  flipPosterSplit: boolean;
  /** Put the stamp/sun decor on the start corner instead of the end. */
  decorStart: boolean;
}

export const getSiteJitter = (subdomain: string | undefined | null): SiteJitter => {
  const rng = mulberry32(hashString(subdomain || 'lightor'));
  // Draw order is part of the contract: reordering draws silently reshuffles
  // every live site's appearance, so append new draws at the end only.
  const blobOffsets: [number, number, number] = [
    rng() * 20 - 10,
    rng() * 20 - 10,
    rng() * 20 - 10,
  ];
  const particleSeed = Math.floor(rng() * 4294967296);
  const floatDuration = 4.5 + rng() * 2;
  const masonryPhase = Math.floor(rng() * 3);
  const flipAboutSplit = rng() < 0.5;
  const mirrorDividers = rng() < 0.5;
  // LT-113 draws — appended per the draw-order contract above.
  const posterAlt = rng() < 0.5;
  const flipPosterSplit = rng() < 0.5;
  const decorStart = rng() < 0.5;
  return { blobOffsets, particleSeed, floatDuration, masonryPhase, flipAboutSplit, mirrorDividers, posterAlt, flipPosterSplit, decorStart };
};

/** A ready-to-use PRNG for components that derive many values (particles). */
export const createRng = (seed: number): (() => number) => mulberry32(seed);

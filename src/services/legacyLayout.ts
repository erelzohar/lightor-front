import type { LayoutBlock } from './editMode';

/**
 * LT-252: a legacy page — the section flow App draws when a config has no
 * blocks — as the blocks it would be. The site editor turns the page into
 * these when the owner first adds or moves a section, so the owner keeps the
 * page they see: the same sections in the same order (a vibe site's seeded
 * order included), the interlude and the booking band where they stand, the
 * inverted block, the backdrops, the spacing and the heading scales.
 *
 * Two things change with the move to blocks. The about section becomes an
 * intro block and a features block (the composed page draws them apart),
 * and the visit cards it showed beside a contact section go: the server keeps
 * a visit block only on a page without one (composer reconcileBlocks).
 */

// The composer's reading of the about layout (lightor-back services/composer.ts).
const INTRO_VARIANT: Record<string, string> = { manifesto: 'manifesto', wall: 'columns' };
const FEATURES_VARIANT: Record<string, string> = { cards: 'tiles', band: 'band', split: 'band', manifesto: 'band', wall: 'wall', timeline: 'timeline', sticky: 'sticky' };

export interface LegacyEntry {
  key: string;
  hidden?: boolean;
}

export interface LegacyContext {
  aboutLayout?: string;
  hasFeatures: boolean;
  /** The interlude's split look (the full photo is the default). */
  interludeSplit: boolean;
  invertKey: string | null;
  backdropKeys: Set<string>;
  backdrop: string;
  /** A vibe site's seeded spacing and heading scale per section; absent elsewhere. */
  spacing?: (key: string) => string;
  scale?: (key: string) => string | undefined;
  /** The footer, drawn outside the flow; null when the site has none. */
  footer: { hidden: boolean } | null;
}

const TYPES: Record<string, { type: string; source: string }> = {
  hero: { type: 'hero', source: 'hero' },
  services: { type: 'ledger', source: 'appointmentTypes' },
  portfolio: { type: 'gallery', source: 'portfolio' },
  testimonials: { type: 'quote', source: 'testimonials' },
  schedule: { type: 'schedule', source: 'schedule' },
  faq: { type: 'faq', source: 'faq' },
  contact: { type: 'contact', source: 'contact' },
  interlude: { type: 'interlude', source: 'portfolio' },
  'booking-band': { type: 'bookingBand', source: 'schedule.description' },
  footer: { type: 'footer', source: 'footer' },
};

export const legacyLayout = (entries: LegacyEntry[], ctx: LegacyContext): LayoutBlock[] => {
  const out: LayoutBlock[] = [];
  const push = (key: string, hidden: boolean | undefined, block: Omit<LayoutBlock, 'key' | 'mod'>) => {
    const mod: NonNullable<LayoutBlock['mod']> = {};
    if (ctx.invertKey === key) mod.invert = true;
    if (ctx.backdropKeys.has(key) && (ctx.backdrop === 'tinted' || ctx.backdrop === 'photo' || ctx.backdrop === 'pattern')) mod.backdrop = ctx.backdrop;
    const spacing = key === 'interlude' ? undefined : ctx.spacing?.(key);
    if (spacing === 'tight' || spacing === 'huge') mod.spacing = spacing;
    const scale = ctx.scale?.(key);
    if (scale === 'giant' || scale === 'micro') mod.scale = scale;
    if (hidden) mod.hidden = true;
    out.push({ key, ...block, ...(Object.keys(mod).length ? { mod } : {}) });
  };

  for (const { key, hidden } of entries) {
    if (key === 'about') {
      push(key, hidden, { type: 'intro', variant: INTRO_VARIANT[ctx.aboutLayout ?? ''] ?? 'plain', source: 'about' });
      if (ctx.hasFeatures) push(key, hidden, { type: 'features', variant: FEATURES_VARIANT[ctx.aboutLayout ?? ''] ?? 'tiles', source: 'about.features' });
    } else if (key === 'interlude') {
      push(key, hidden, { ...TYPES.interlude, ...(ctx.interludeSplit ? { variant: 'split' } : {}) });
    } else if (TYPES[key]) {
      push(key, hidden, TYPES[key]);
    }
  }
  if (ctx.footer) push('footer', ctx.footer.hidden, TYPES.footer);
  return out;
};

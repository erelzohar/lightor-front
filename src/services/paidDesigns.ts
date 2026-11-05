/**
 * LT-570 (Erel 2026-11-03/04): designs only the paid plans show - first the
 * ten that really move. On the free plan the server serves `motion: false`
 * and each of them gives way to its section's default design, with nothing
 * said about it: the products' conveyor, clothes rail, coverflow and orbit
 * (LT-583) to the quiet tiles, the clothesline, cascade and curve galleries to the masonry,
 * the parallax and opening heroes to the full image, the sonar and metal
 * backdrops to the hero's own background. The owner's pick stays stored, so
 * an upgrade brings it straight back. Absent `motion` (the register's preview,
 * older payloads) keeps every design: the wizard builds with all of them.
 */
const PAID: Record<string, { paid: readonly string[]; instead: string }> = {
  heroLayout: { paid: ['parallax', 'expand'], instead: 'fullbleed' },
  portfolioLayout: { paid: ['clothesline', 'cascade', 'curve'], instead: 'masonry' },
  productsLayout: { paid: ['belt', 'hanger', 'coverflow', 'orbit'], instead: 'well' },
  decor: { paid: ['sonar', 'metal'], instead: 'none' },
};

/** The design token a block's own variant stands in for (ComposedPage). */
const BLOCK_TOKEN: Record<string, string> = { hero: 'heroLayout', gallery: 'portfolioLayout', products: 'productsLayout' };

const freeOf = (token: string, value: unknown): unknown => {
  const rule = PAID[token];
  return rule && typeof value === 'string' && rule.paid.includes(value) ? rule.instead : value;
};

type Served = { design?: unknown; blocks?: unknown };

/** A served config with every paid design in its section's default, for a plan without them. */
export const withoutPaidDesigns = <T extends Served>(json: T): T => {
  const design = json.design && typeof json.design === 'object'
    ? Object.fromEntries(Object.entries(json.design as Record<string, unknown>).map(([key, value]) => [key, freeOf(key, value)]))
    : json.design;
  const blocks = Array.isArray(json.blocks)
    ? json.blocks.map((block) => {
        const token = block && typeof block === 'object' ? BLOCK_TOKEN[String((block as { type?: unknown }).type)] : undefined;
        return token ? { ...block, variant: freeOf(token, (block as { variant?: unknown }).variant) } : block;
      })
    : json.blocks;
  return { ...json, design, blocks };
};

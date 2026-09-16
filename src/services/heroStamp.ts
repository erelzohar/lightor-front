/**
 * LT-174: what the hero's round stamp decor says. It used to repeat the hero
 * title a few centimetres from the title itself. The AI now writes a line of
 * its own (`hero.stamp`); configs from before it have none, so fall back to the
 * subtitle when it says something the title doesn't, then to the business
 * name. Never the title — an empty string hides the stamp.
 */
const norm = (s?: string): string => (s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export const stampTextFor = (
  hero: { title?: string; subtitle?: string; stamp?: string },
  businessName?: string,
): string => {
  const title = norm(hero.title);
  for (const candidate of [hero.stamp, hero.subtitle, businessName]) {
    const text = candidate?.trim();
    if (text && norm(text) !== title) return text;
  }
  return '';
};

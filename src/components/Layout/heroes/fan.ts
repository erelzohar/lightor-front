// LT-667: what the fan hero shows, apart from it, so the page can pick its
// pictures without loading the hero's own file (LT-603).

const VIDEO = /\.(mp4|webm|mov)(\?|$)/i;

/** One of the fan's pictures, and where the editor finds it (none for a product's or a service's). */
export interface FanPicture { src: string; path?: string; hero?: boolean }

/**
 * The second line's closing words, the ones in the site's colour: the last
 * half of its words (one of two, two of three), all of a single word.
 */
export const splitHighlight = (text: string): [string, string] => {
  const words = (text ?? '').trim().split(/\s+/).filter(Boolean);
  const cut = Math.floor(words.length / 2);
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
};

/** The fan's pictures: the hero's first, then the gallery's (or the products'), then the services', each once, three at most. */
export const fanPictures = (hero: string | undefined, thumbs: string[], thumbsPath: string | undefined, services: (string | undefined)[]): FanPicture[] => {
  const seen = new Set<string>();
  const all: FanPicture[] = [
    ...(hero ? [{ src: hero, path: 'components.hero.heroImageSrc', hero: true }] : []),
    ...thumbs.map((src, i) => ({ src, path: thumbsPath && `${thumbsPath}.${i}.url` })),
    ...services.filter((src): src is string => !!src).map((src) => ({ src })),
  ];
  return all.filter((p) => p.src && !VIDEO.test(p.src) && !seen.has(p.src) && !!seen.add(p.src)).slice(0, 3);
};

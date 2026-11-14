import { createContext, useContext } from 'react';

/**
 * LT-658 (Erel 2026-11-14: a post's picture is one that belongs to the site -
 * "if the AI makes pictures of something (the hero, a product, whatever) or we
 * already have a picture that fits, those are the posts' pictures", never an
 * empty tile and never any photo at all): a post with no picture of its own
 * shows one of the site's. The site's own pictures come first (what the build's
 * AI made, what the owner put up), then a stock pack that shows its trade, and
 * a general stock photo only when the site has nothing else. Nothing is stored:
 * the picture follows the site's as they change (a build's AI pictures land
 * after its posts), and a post that gets a cover shows that cover.
 */
export interface SitePictures {
  /** The site's pictures, its own first (gallery, hero, products, services), then stock that shows its trade, a general stock photo last. */
  pictures: string[];
  /** The newest posts' slugs in the order the site lists them: neighbours get different pictures. */
  order: string[];
}

export const SitePicturesContext = createContext<SitePictures>({ pictures: [], order: [] });

const VIDEO = /\.(mp4|webm|mov)(\?|$)/i;
const picture = (v: unknown): string[] => (typeof v === 'string' && v.trim() && !VIDEO.test(v) && !v.startsWith('data:') ? [v.trim()] : []);

interface PicturedConfig {
  components?: {
    hero?: { heroImageSrc?: unknown } | null;
    portfolio?: { visible?: boolean; items?: ({ url?: unknown } | null)[] } | null;
  } | null;
  products?: { items?: ({ images?: ({ url?: unknown } | null)[] } | null)[] } | null;
  appointmentTypes?: ({ image?: unknown } | null)[] | null;
  blog?: { latest?: { slug: string }[] } | null;
}

/** A stock pack's photo: 0 = not stock (the build's AI made it, or the owner put it up), 1 = a pack of the site's trade, 2 = the general pack. */
const PACK = /\/packs\/([a-z0-9-]+)\//i;
const stock = (url: string): number => {
  const pack = PACK.exec(url)?.[1];
  return !pack ? 0 : pack === 'general' ? 2 : 1;
};

export const sitePicturesOf = (config: PicturedConfig | null | undefined): SitePictures => {
  const c = config?.components;
  const all = [...new Set([
    ...(c?.portfolio?.items ?? []).flatMap((item) => picture(item?.url)),
    ...picture(c?.hero?.heroImageSrc),
    ...(config?.products?.items ?? []).flatMap((product) => picture(product?.images?.[0]?.url)),
    ...(config?.appointmentTypes ?? []).flatMap((type) => picture(type?.image)),
  ])];
  // What belongs to the site, its own first; a general stock photo only when there is nothing else.
  const fitting = [...all.filter((url) => stock(url) === 0), ...all.filter((url) => stock(url) === 1)];
  return { pictures: fitting.length ? fitting : all, order: (config?.blog?.latest ?? []).map((post) => post.slug) };
};

const hash = (text: string): number => {
  let h = 0;
  for (const ch of text) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return h;
};

/** The picture a post without a cover shows; the same one wherever the post is drawn. */
export const standInCover = (post: { slug?: string; title: string }, site: SitePictures): string | undefined => {
  if (!site.pictures.length) return undefined;
  const at = post.slug ? site.order.indexOf(post.slug) : -1;
  return site.pictures[(at >= 0 ? at : hash(post.slug || post.title)) % site.pictures.length];
};

/** A post's cover: its own, else one of the site's pictures. */
export const useCoverOf = (post: { cover?: string; slug?: string; title: string } | null | undefined): string | undefined => {
  const site = useContext(SitePicturesContext);
  return post ? post.cover || standInCover(post, site) : undefined;
};

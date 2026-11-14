import { createContext, useContext } from 'react';

/**
 * LT-658 (Erel 2026-11-14: "the pictures in the blog's posts can be any of the
 * existing pictures, only not empty"): a post with no picture of its own shows
 * one of the site's. Nothing is stored: the picture follows the site's as they
 * change (a build's AI pictures land after its posts), and a post that gets a
 * cover shows that cover.
 */
export interface SitePictures {
  /** The site's pictures, the place's first: gallery, hero, products, services. */
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

export const sitePicturesOf = (config: PicturedConfig | null | undefined): SitePictures => {
  const c = config?.components;
  const all = [
    ...(c?.portfolio?.items ?? []).flatMap((item) => picture(item?.url)),
    ...picture(c?.hero?.heroImageSrc),
    ...(config?.products?.items ?? []).flatMap((product) => picture(product?.images?.[0]?.url)),
    ...(config?.appointmentTypes ?? []).flatMap((type) => picture(type?.image)),
  ];
  return { pictures: [...new Set(all)], order: (config?.blog?.latest ?? []).map((post) => post.slug) };
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

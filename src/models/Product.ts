import { currencyOf, type Currency } from '../utils/currency';

/**
 * LT-540: a product as the public site gets it. The config carries the few the
 * home page draws; the list and each product live at their own addresses.
 * `price` is whole minor units of the site's currency, absent when the owner
 * gave none.
 */
export interface ProductImage {
  url: string;
  alt?: string;
}

/** LT-588: a colour a product comes in: what the visitor reads, and its swatch. */
export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  summary?: string;
  price?: number;
  images: ProductImage[];
  category?: string;
  /** LT-588: what a visitor may pick; the inquiry carries the pick. */
  colors?: ProductColor[];
  sizes?: string[];
  soldOut?: boolean;
}

export interface Product extends ProductCard {
  description?: string;
  details: string[];
}

export interface ProductsSummary {
  /** How many the site shows. Past what `items` holds, the rest are on `/products`. */
  total: number;
  /** Products have addresses of their own (a site with one has none). */
  pages: boolean;
  items: Product[];
}

export const PRODUCTS_PATH = '/products';

const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

const HEX = /^#[0-9a-fA-F]{6}$/;
const parseColors = (json: unknown): ProductColor[] =>
  (Array.isArray(json) ? json : [])
    .filter((c) => c && text(c.name) && typeof c.hex === 'string' && HEX.test(c.hex))
    .map((c) => ({ name: text(c.name)!, hex: c.hex as string }));
const parseSizes = (json: unknown): string[] =>
  (Array.isArray(json) ? json : []).flatMap((s) => (text(s) ? [text(s)!] : []));

const parseImages = (json: unknown): ProductImage[] =>
  (Array.isArray(json) ? json : [])
    .filter((i) => i && typeof i.url === 'string' && i.url)
    .map((i) => ({ url: i.url, ...(text(i.alt) ? { alt: text(i.alt) } : {}) }));

/** Lenient, as blocks are: a broken entry is dropped, never thrown. */
export const parseProduct = (json: unknown): Product | null => {
  const r = json as Record<string, unknown> | null;
  if (!r || typeof r !== 'object' || !text(r.id) || !text(r.slug) || !text(r.name)) return null;
  return {
    id: text(r.id)!,
    slug: text(r.slug)!,
    name: text(r.name)!,
    summary: text(r.summary),
    price: typeof r.price === 'number' ? r.price : undefined,
    images: parseImages(r.images),
    category: text(r.category),
    ...(parseColors(r.colors).length ? { colors: parseColors(r.colors) } : {}),
    ...(parseSizes(r.sizes).length ? { sizes: parseSizes(r.sizes) } : {}),
    soldOut: r.soldOut === true,
    description: text(r.description),
    details: Array.isArray(r.details) ? r.details.filter((d): d is string => typeof d === 'string' && !!d.trim()) : [],
  };
};

export const parseProducts = (json: unknown): ProductsSummary | undefined => {
  const r = json as Record<string, unknown> | null;
  if (!r || typeof r !== 'object' || !Array.isArray(r.items)) return undefined;
  const items = r.items.map(parseProduct).filter((p): p is Product => !!p);
  return { total: typeof r.total === 'number' ? r.total : items.length, pages: r.pages === true, items };
};

/** Past what the home page holds, the rest wait on the products' own page. */
export const productsHavePage = (summary: ProductsSummary | undefined): boolean =>
  !!summary?.pages && summary.total > summary.items.length;

export const productPath = (product: Pick<ProductCard, 'slug'>): string => `${PRODUCTS_PATH}/${product.slug}`;

/**
 * LT-554: the wizard's sample products (`draft-0`...), before the site exists.
 * Its preview has no site to fetch their pages from, and the config holds them
 * whole, so their pages are drawn from it.
 */
export const draftProducts = (summary: ProductsSummary | undefined): Product[] | undefined =>
  summary?.items.length && summary.items.every((p) => p.id.startsWith('draft-')) ? summary.items : undefined;

/** LT-554: each product's first picture, in the owner's order: the hero's frames on a site with no gallery. */
export const productPictures = (summary: ProductsSummary | undefined): string[] =>
  (summary?.items ?? []).map((p) => p.images[0]?.url).filter((url): url is string => !!url);

const SYMBOL: Record<Currency, string> = { ILS: '₪', USD: '$', EUR: '€', GBP: '£' };

/** Minor units as a price: whole numbers bare, cents only when there are some. */
export const productPrice = (price: number | undefined, currency?: unknown): string => {
  if (typeof price !== 'number') return '';
  const major = price / 100;
  const shown = Number.isInteger(major)
    ? major.toLocaleString('en-US')
    : major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${SYMBOL[currencyOf(currency)]}${shown}`;
};

/** The categories in the order the products first use them. */
export const categoriesOf = (products: Pick<ProductCard, 'category'>[]): string[] =>
  [...new Set(products.map((p) => p.category).filter((c): c is string => !!c))];

/**
 * LT-587 (Erel: the products page by category, not one heap): each category
 * with its products, in the order they first appear, and the products with
 * none last (`name` empty). One group when there are fewer than two categories.
 */
export const groupsOf = <T extends Pick<ProductCard, 'category'>>(products: T[]): { name: string; items: T[] }[] => {
  const categories = categoriesOf(products);
  if (categories.length < 2) return [{ name: '', items: products }];
  const groups = categories.map((name) => ({ name, items: products.filter((p) => p.category === name) }));
  const rest = products.filter((p) => !p.category);
  return rest.length ? [...groups, { name: '', items: rest }] : groups;
};

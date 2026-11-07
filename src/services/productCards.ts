import type { ProductCard } from '../models/Product';

/**
 * LT-605: the products a visitor has already seen on this visit. A product's
 * page draws at once from its card (then fills in the rest), and the products'
 * page from the last list, so the wall's move to a product and back has both
 * pages in hand at the moment it starts.
 */
const cards = new Map<string, ProductCard>();
let list: ProductCard[] | null = null;

export const rememberCards = (items: readonly ProductCard[]): void => {
  for (const p of items) cards.set(p.slug, p);
};

export const cardOf = (slug: string): ProductCard | undefined => cards.get(slug);

export const rememberList = (items: readonly ProductCard[]): void => {
  list = [...items];
  rememberCards(items);
};

export const lastList = (): ProductCard[] | null => list;

/** Tests start from nothing. */
export const forgetCards = (): void => {
  cards.clear();
  list = null;
};

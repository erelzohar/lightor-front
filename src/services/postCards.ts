import type { PostCard } from '../models/Post';

/**
 * LT-610: the posts a visitor has already seen on this visit (as the products'
 * cards, LT-605): a post's page draws its title and picture at once from its
 * card while the rest arrives, and the blog's page from the last list.
 */
const cards = new Map<string, PostCard>();
let list: PostCard[] | null = null;

export const rememberPosts = (items: readonly PostCard[]): void => {
  for (const p of items) cards.set(p.slug, p);
};

export const postCardOf = (slug: string): PostCard | undefined => cards.get(slug);

export const rememberPostList = (items: readonly PostCard[]): void => {
  list = [...items];
  rememberPosts(items);
};

export const lastPostList = (): PostCard[] | null => list;

/** Tests start from nothing. */
export const forgetPosts = (): void => {
  cards.clear();
  list = null;
};

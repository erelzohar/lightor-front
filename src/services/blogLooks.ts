import type { Block } from '../models/Block';
import type { BlogLayout, BlogSectionLayout, PostLayout, StylePreset } from '../models/DesignConfig';

/**
 * LT-610: the blog's looks. Erel's six pastes became three looks for the
 * blog's page, three for the home page's section, and a post's page comes in
 * two; each style has its own, and the owner's pick (the design fields, the
 * section block's variant) wins.
 */
interface Looks { page: BlogLayout; post: PostLayout; section: BlogSectionLayout }

const LOOKS: Partial<Record<StylePreset, Looks>> = {
  crisp: { page: 'grid', post: 'classic', section: 'latest' },
  earthy: { page: 'grid', post: 'classic', section: 'latest' },
  industrial: { page: 'grid', post: 'classic', section: 'article' },
  minimal: { page: 'grid', post: 'classic', section: 'latest' },
  corporate: { page: 'grid', post: 'classic', section: 'latest' },
  warmOrganic: { page: 'grid', post: 'classic', section: 'latest' },
  bistro: { page: 'grid', post: 'classic', section: 'latest' },
  playful: { page: 'grid', post: 'wide', section: 'carousel' },
  boldStartup: { page: 'grid', post: 'wide', section: 'carousel' },
  brutalist: { page: 'grid', post: 'wide', section: 'carousel' },
  atelier: { page: 'tagged', post: 'classic', section: 'article' },
  heritage: { page: 'tagged', post: 'classic', section: 'latest' },
  gallery: { page: 'tagged', post: 'wide', section: 'article' },
  editorial: { page: 'tagged', post: 'classic', section: 'article' },
  luxe: { page: 'tagged', post: 'classic', section: 'article' },
  boutique: { page: 'tagged', post: 'classic', section: 'article' },
  electric: { page: 'glass', post: 'wide', section: 'carousel' },
  festive: { page: 'glass', post: 'wide', section: 'carousel' },
  serene: { page: 'glass', post: 'classic', section: 'latest' },
  underground: { page: 'glass', post: 'wide', section: 'carousel' },
};

const PLAIN: Looks = { page: 'grid', post: 'classic', section: 'latest' };

export const BLOG_LAYOUTS: BlogLayout[] = ['grid', 'tagged', 'glass'];
export const POST_LAYOUTS: PostLayout[] = ['classic', 'wide'];
export const BLOG_SECTION_LAYOUTS: BlogSectionLayout[] = ['latest', 'article', 'carousel'];

/** The looks a site's blog takes: the owner's, else its style's. */
export const blogLooksOf = (design?: { stylePreset?: StylePreset | null; blogLayout?: BlogLayout; postLayout?: PostLayout } | null): Looks => {
  const own = (design?.stylePreset && LOOKS[design.stylePreset]) || PLAIN;
  return {
    page: design?.blogLayout && BLOG_LAYOUTS.includes(design.blogLayout) ? design.blogLayout : own.page,
    post: design?.postLayout && POST_LAYOUTS.includes(design.postLayout) ? design.postLayout : own.post,
    section: own.section,
  };
};

/** The section block's look: its own variant, else its style's. */
export const blogSectionLayoutOf = (variant: string | undefined, design?: Parameters<typeof blogLooksOf>[0]): BlogSectionLayout =>
  BLOG_SECTION_LAYOUTS.includes(variant as BlogSectionLayout) ? (variant as BlogSectionLayout) : blogLooksOf(design).section;

export const BLOG_BLOCK_ID = 'blog';
/** Where the section goes on a page that has none of its own: before the way to get in touch. */
const BEFORE = new Set<Block['type']>(['contact', 'social', 'mapStrip', 'footer']);

/**
 * A page with blocks and a blog gets the "latest posts" section even when its
 * blocks were made before the blog: it goes before the contact section, in its
 * style's look. Once the owner saves the page in the editor the block is the
 * page's own, to move or hide like any other.
 */
export const withBlogBlock = <T extends { id: string; type: string }>(blocks: T[], hasBlog: boolean): T[] => {
  if (!hasBlog || !blocks.length || blocks.some((b) => b.type === 'blog')) return blocks;
  const at = blocks.findIndex((b) => BEFORE.has(b.type as Block['type']));
  const block = { id: BLOG_BLOCK_ID, type: 'blog' } as T;
  return at === -1 ? [...blocks, block] : [...blocks.slice(0, at), block, ...blocks.slice(at)];
};

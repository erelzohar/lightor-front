/**
 * LT-610 (the LT-495 plan): a post as the public site gets it. The config
 * carries the newest few for the home page's section; the blog and each post
 * live at their own addresses (`/blog`, `/blog/<slug>`). The body is blocks,
 * never HTML: every block is drawn as text.
 */
export type PostBlockKind = 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'quote' | 'image';

export interface PostBlock {
  kind: PostBlockKind;
  text?: string;
  items?: string[];
  url?: string;
  caption?: string;
}

export interface PostCard {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  category?: string;
  cover?: string;
  publishedAt: string;
  updatedAt: string;
  minutes: number;
}

export interface Post extends PostCard {
  body: PostBlock[];
}

export interface BlogSummary {
  total: number;
  latest: PostCard[];
}

export const BLOG_PATH = '/blog';
export const postPath = (post: Pick<PostCard, 'slug'>): string => `${BLOG_PATH}/${post.slug}`;

const KINDS: PostBlockKind[] = ['h2', 'h3', 'p', 'ul', 'ol', 'quote', 'image'];
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** Lenient, as blocks are: a broken entry is dropped, never thrown. */
export const parsePostCard = (json: unknown): PostCard | null => {
  const r = json as Record<string, unknown> | null;
  if (!r || typeof r !== 'object' || !text(r.id) || !text(r.slug) || !text(r.title)) return null;
  return {
    id: text(r.id)!,
    slug: text(r.slug)!,
    title: text(r.title)!,
    ...(text(r.summary) ? { summary: text(r.summary) } : {}),
    ...(text(r.category) ? { category: text(r.category) } : {}),
    ...(text(r.cover) ? { cover: text(r.cover) } : {}),
    publishedAt: text(r.publishedAt) ?? '',
    updatedAt: text(r.updatedAt) ?? text(r.publishedAt) ?? '',
    minutes: typeof r.minutes === 'number' && r.minutes > 0 ? Math.round(r.minutes) : 1,
  };
};

export const parseBlocks = (json: unknown): PostBlock[] =>
  (Array.isArray(json) ? json : []).flatMap((raw): PostBlock[] => {
    const b = raw as Record<string, unknown> | null;
    if (!b || typeof b !== 'object' || !KINDS.includes(b.kind as PostBlockKind)) return [];
    const kind = b.kind as PostBlockKind;
    if (kind === 'ul' || kind === 'ol') {
      const items = (Array.isArray(b.items) ? b.items : []).flatMap((i) => (text(i) ? [text(i)!] : []));
      return items.length ? [{ kind, items }] : [];
    }
    if (kind === 'image') return text(b.url) ? [{ kind, url: text(b.url)!, ...(text(b.caption) ? { caption: text(b.caption) } : {}) }] : [];
    return text(b.text) ? [{ kind, text: text(b.text)! }] : [];
  });

export const parsePost = (json: unknown): Post | null => {
  const card = parsePostCard(json);
  return card ? { ...card, body: parseBlocks((json as Record<string, unknown>).body) } : null;
};

export const parseBlog = (json: unknown): BlogSummary | undefined => {
  const r = json as Record<string, unknown> | null;
  if (!r || typeof r !== 'object' || !Array.isArray(r.latest)) return undefined;
  const latest = r.latest.map(parsePostCard).filter((p): p is PostCard => !!p);
  if (!latest.length) return undefined;
  return { total: typeof r.total === 'number' ? r.total : latest.length, latest };
};

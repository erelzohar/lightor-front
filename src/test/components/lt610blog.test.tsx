import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import BlogPage, { PAGE_SIZE } from '../../components/blog/BlogPage';
import PostPage from '../../components/blog/PostPage';
import BlogSection, { sectionLookFor } from '../../components/blog/BlogSection';
import BlogCarousel, { gapFor } from '../../components/blog/BlogCarousel';
import { parseBlog, parseBlocks, parsePost, parsePostCard, type Post, type PostCard } from '../../models/Post';
import { blogLooksOf, blogSectionLayoutOf, withBlogBlock } from '../../services/blogLooks';
import { forgetPosts, rememberPosts } from '../../services/postCards';
import { navLinksFromBlocks } from '../../services/navLinks';
import { partsFor, preloadAllParts } from '../../designs/parts';
import { SiteNavContext } from '../../services/siteNav';
import WebConfigService from '../../services/WebConfigService';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import type { Block } from '../../models/Block';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), language: 'he' }),
}));
vi.mock('../../components/NotFound', () => ({ default: () => <p>not found</p> }));

/**
 * LT-610 (the LT-495 plan, Erel's six blog pastes): the blog's page in three
 * looks, a post's page in two, the home page's section in three; the menus
 * lead to it; nothing is cut; the moving carousel stops when it should.
 */

const card = (i: number, extra: Partial<PostCard> = {}): PostCard => ({
  id: `id${i}`, slug: `post-${i}`, title: `כותרת ${i}`, summary: `שורה על פוסט ${i}`, category: 'טיפים',
  cover: `https://x/c${i}.jpg`, publishedAt: '2026-11-01T09:00:00.000Z', updatedAt: '2026-11-01T09:00:00.000Z', minutes: 3, ...extra,
});
const post = (extra: Partial<Post> = {}): Post => ({
  ...card(1),
  body: [
    { kind: 'p', text: 'פסקה ראשונה.' },
    { kind: 'h2', text: 'כותרת משנה' },
    { kind: 'ul', items: ['אחד', 'שניים'] },
    { kind: 'quote', text: 'משפט שלי' },
    { kind: 'image', url: 'https://x/in.jpg', caption: 'כיתוב' },
  ],
  ...extra,
});
const nav = { atHome: false, go: vi.fn() };
const withNav = (node: React.ReactNode) => <SiteNavContext.Provider value={nav}>{node}</SiteNavContext.Provider>;

beforeAll(async () => { await preloadAllParts(); });
afterEach(() => { forgetPosts(); vi.restoreAllMocks(); nav.go.mockReset(); document.getElementById('lightor-page')?.remove(); });

describe('the post model (LT-610)', () => {
  it('keeps what it can draw and drops the rest', () => {
    expect(parsePostCard({ id: 'a', slug: 's', title: '' })).toBeNull();
    expect(parsePostCard({ id: 'a', slug: 's', title: 'T', minutes: 0 })?.minutes).toBe(1);
    expect(parseBlocks([{ kind: 'p', text: ' x ' }, { kind: 'video', text: 'y' }, { kind: 'ul', items: ['', 'z'] }, { kind: 'image' }]))
      .toEqual([{ kind: 'p', text: 'x' }, { kind: 'ul', items: ['z'] }]);
    expect(parsePost({ id: 'a', slug: 's', title: 'T', body: [{ kind: 'h2', text: 'H' }] })?.body).toEqual([{ kind: 'h2', text: 'H' }]);
    expect(parseBlog({ total: 3, latest: [] })).toBeUndefined();
    expect(parseBlog({ total: 3, latest: [card(1)] })?.total).toBe(3);
  });

  it('reads the blog from the served config', () => {
    const base = RAW_AI_RESPONSE_SHAPE as Record<string, any>;
    const config = WebsiteConfig.fromJSON({ ...base, components: { ...base.components, blog: { title: 'טיפים' } }, blog: { total: 1, latest: [card(1)] } });
    expect(config.blog?.latest[0].slug).toBe('post-1');
    expect(config.components.blog.title).toBe('טיפים');
  });
});

describe('the looks (LT-610)', () => {
  it("gives each style its own, and the owner's pick wins", () => {
    expect(blogLooksOf({ stylePreset: 'festive' })).toEqual({ page: 'glass', post: 'wide', section: 'carousel' });
    expect(blogLooksOf({ stylePreset: 'atelier' })).toEqual({ page: 'tagged', post: 'classic', section: 'article' });
    expect(blogLooksOf(null)).toEqual({ page: 'grid', post: 'classic', section: 'latest' });
    expect(blogLooksOf({ stylePreset: 'festive', blogLayout: 'grid', postLayout: 'classic' })).toMatchObject({ page: 'grid', post: 'classic' });
    expect(blogSectionLayoutOf('article', { stylePreset: 'festive' })).toBe('article');
    expect(blogSectionLayoutOf(undefined, { stylePreset: 'festive' })).toBe('carousel');
  });

  it('puts the section before the contact one on a page made before the blog, once', () => {
    const blocks = [{ id: 'h', type: 'hero' }, { id: 'c', type: 'contact' }, { id: 'f', type: 'footer' }] as Block[];
    expect(withBlogBlock(blocks, true).map((b) => b.type)).toEqual(['hero', 'blog', 'contact', 'footer']);
    expect(withBlogBlock(blocks, false)).toBe(blocks);
    const own = [...blocks, { id: 'b', type: 'blog', mod: { hidden: true } }] as Block[];
    expect(withBlogBlock(own, true)).toBe(own);
  });

  it('a carousel of fewer than three is drawn as articles', () => {
    expect(sectionLookFor('carousel', 2)).toBe('article');
    expect(sectionLookFor('carousel', 3)).toBe('carousel');
    expect(sectionLookFor('latest', 1)).toBe('latest');
  });
});

describe('the menus (LT-610)', () => {
  it('lead to the blog, which keeps its place among five', () => {
    const blocks = ['hero', 'intro', 'gallery', 'faq', 'quote', 'blog', 'schedule', 'contact'].map((type, i) => ({ id: String(i), type }));
    const links = navLinksFromBlocks(blocks, { blog: 'טיפים' });
    expect(links.length).toBeLessThanOrEqual(5);
    expect(links.find((l) => l.href === '/blog')?.title).toBe('טיפים');
  });
});

describe('the parts (LT-610)', () => {
  const config = (extra: Record<string, unknown> = {}) => WebsiteConfig.fromJSON({
    ...(RAW_AI_RESPONSE_SHAPE as Record<string, unknown>), design: { stylePreset: 'festive' },
    blocks: [{ id: 'h', type: 'hero' }, { id: 'c', type: 'contact' }],
    blog: { total: 4, latest: [card(1), card(2), card(3)] }, ...extra,
  });
  it('names the section and its look on the home page, the pages for later', () => {
    const parts = partsFor(config(), '/');
    expect(parts.now).toEqual(expect.arrayContaining(['blogSection', 'blogCarousel', 'blogArticles']));
    expect(parts.soon).toEqual(expect.arrayContaining(['blogPage', 'blogGlass', 'postPage']));
  });
  it('waits for the pages on the blog itself', () => {
    expect(partsFor(config(), '/blog/post-1').now).toEqual(expect.arrayContaining(['blogPage', 'blogGlass', 'postPage']));
  });
  it('names nothing of the blog for a site without one', () => {
    const parts = partsFor(config({ blog: undefined }), '/');
    expect([...parts.now, ...parts.soon].some((k) => k.startsWith('blog') || k === 'postPage')).toBe(false);
  });
});

describe("the blog's page (LT-610)", () => {
  it.each(['grid', 'tagged', 'glass'] as const)('draws every post in the %s look, newest first, with nothing cut', async (layout) => {
    vi.spyOn(WebConfigService.getInstance(), 'getPosts').mockResolvedValue([card(1), card(2, { category: undefined, cover: undefined })]);
    const { container } = render(withNav(<BlogPage businessName="הסטודיו" layout={layout} />));
    await screen.findByTestId('blog-page');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('blog.title');
    expect(screen.getByText('כותרת 1')).toBeTruthy();
    expect(screen.getByText('כותרת 2')).toBeTruthy();
    expect(screen.getAllByRole('link').some((a) => a.getAttribute('href') === '/blog/post-1')).toBe(true);
    // LT-510: no text is cut on a site.
    expect(container.innerHTML).not.toMatch(/line-clamp|truncate|text-ellipsis/);
    // A post with no picture shows its first letter instead.
    expect(container.textContent).toContain('כ');
  });

  it('paints at once from the edge\'s copy, and shows more on asking', async () => {
    const many = Array.from({ length: PAGE_SIZE + 3 }, (_, i) => card(i));
    const inline = document.createElement('script');
    inline.id = 'lightor-page';
    inline.type = 'application/json';
    inline.textContent = JSON.stringify({ kind: 'blog', data: many });
    document.body.appendChild(inline);
    const fetch = vi.spyOn(WebConfigService.getInstance(), 'getPosts');
    render(withNav(<BlogPage businessName="B" title="טיפים" layout="grid" />));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('טיפים');
    expect(screen.getAllByRole('listitem')).toHaveLength(PAGE_SIZE);
    fireEvent.click(screen.getByRole('button', { name: 'blog.loadMore' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(PAGE_SIZE + 3);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("lists the config's posts in a preview, fetching nothing", () => {
    const fetch = vi.spyOn(WebConfigService.getInstance(), 'getPosts');
    render(withNav(<BlogPage businessName="B" drafts={[card(1), card(2)]} />));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('says so when the blog cannot be read', async () => {
    vi.spyOn(WebConfigService.getInstance(), 'getPosts').mockRejectedValue(new Error('down'));
    render(withNav(<BlogPage businessName="B" />));
    expect(await screen.findByText('blog.failed')).toBeTruthy();
  });
});

describe("a post's page (LT-610)", () => {
  it('draws every block as text, the business as its writer, the way to share and the main button', async () => {
    vi.spyOn(WebConfigService.getInstance(), 'getPost').mockResolvedValue({ post: post(), more: [card(2), card(3)] });
    render(withNav(<PostPage slug="post-1" businessName="הסטודיו" cta={{ href: '/#schedule', label: 'קביעת תור' }} />));
    const page = await screen.findByTestId('post-page');
    expect(within(page).getByRole('heading', { level: 1 }).textContent).toBe('כותרת 1');
    const body = screen.getByTestId('post-body');
    expect(within(body).getByRole('heading', { level: 2 }).textContent).toBe('כותרת משנה');
    expect(within(body).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['אחד', 'שניים']);
    expect(body.querySelector('blockquote')?.textContent).toBe('משפט שלי');
    expect(body.querySelector('figcaption')?.textContent).toBe('כיתוב');
    expect(page.textContent).toContain('הסטודיו');
    expect(screen.getByRole('link', { name: /blog.shareWhatsapp/ }).getAttribute('href')).toContain('wa.me');
    fireEvent.click(screen.getByRole('link', { name: 'קביעת תור' }));
    expect(nav.go).toHaveBeenCalledWith('/#schedule');
    expect(screen.getByText('blog.more')).toBeTruthy();
    expect(document.title).toContain('כותרת 1 | הסטודיו');
  });

  it("draws the title over the picture in the wide look, and in a column when there is no picture", async () => {
    vi.spyOn(WebConfigService.getInstance(), 'getPost').mockResolvedValueOnce({ post: post(), more: [] });
    const { unmount } = render(withNav(<PostPage slug="post-1" businessName="B" layout="wide" />));
    expect((await screen.findByTestId('post-page')).getAttribute('data-layout')).toBe('wide');
    unmount();
    vi.spyOn(WebConfigService.getInstance(), 'getPost').mockResolvedValueOnce({ post: post({ cover: undefined }), more: [] });
    render(withNav(<PostPage slug="post-1" businessName="B" layout="wide" />));
    expect((await screen.findByTestId('post-page')).getAttribute('data-layout')).toBe('classic');
  });

  it('draws the title at once from a card seen on this visit', async () => {
    rememberPosts([card(7)]);
    let answer: (v: { post: Post; more: PostCard[] }) => void = () => undefined;
    vi.spyOn(WebConfigService.getInstance(), 'getPost').mockReturnValue(new Promise((r) => { answer = r; }));
    render(withNav(<PostPage slug="post-7" businessName="B" />));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('כותרת 7');
    await act(async () => { answer({ post: post({ ...card(7) }), more: [] }); });
    await waitFor(() => expect(screen.getByTestId('post-body')).toBeTruthy());
  });

  it("draws the dashboard's draft in the preview, fetching nothing", () => {
    const fetch = vi.spyOn(WebConfigService.getInstance(), 'getPost');
    render(withNav(<PostPage slug="post-1" businessName="B" draft={post({ title: 'טיוטה' })} />));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('טיוטה');
    expect(screen.getByTestId('post-body')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('is not found when it is no post of the site', async () => {
    vi.spyOn(WebConfigService.getInstance(), 'getPost').mockResolvedValue(null);
    render(withNav(<PostPage slug="nope" businessName="B" />));
    expect(await screen.findByText('not found')).toBeTruthy();
  });
});

describe("the home page's section (LT-610)", () => {
  it('shows nothing without posts', () => {
    const { container } = render(withNav(<BlogSection blog={{ total: 0, latest: [] }} />));
    expect(container.innerHTML).toBe('');
  });

  it.each([['latest', 'blog-latest'], ['article', 'blog-articles'], ['carousel', 'blog-carousel']] as const)('draws the %s look and the way to all posts', (layout, testId) => {
    render(withNav(<BlogSection blog={{ total: 9, latest: [card(1), card(2), card(3), card(4)] }} layout={layout} businessName="B" />));
    expect(screen.getByTestId(testId)).toBeTruthy();
    const all = screen.getByRole('link', { name: /blog.all/ });
    expect(all.getAttribute('href')).toBe('/blog');
    expect(all.textContent).toContain('"count":9');
  });
});

describe('the carousel (LT-610)', () => {
  it('turns by its arrows and keys (mirrored in Hebrew), and stops when asked', () => {
    vi.useFakeTimers();
    try {
      render(withNav(<BlogCarousel posts={[card(1), card(2), card(3)]} />));
      const heading = () => screen.getByRole('heading', { level: 3 }).textContent;
      expect(heading()).toBe('כותרת 1');
      act(() => { vi.advanceTimersByTime(5100); });
      expect(heading()).toBe('כותרת 2');
      fireEvent.click(screen.getByRole('button', { name: 'blog.next' }));
      expect(heading()).toBe('כותרת 3');
      // After a pick it stands still.
      act(() => { vi.advanceTimersByTime(12000); });
      expect(heading()).toBe('כותרת 3');
      // In Hebrew the left arrow key goes forward.
      fireEvent.keyDown(screen.getByTestId('blog-carousel'), { key: 'ArrowLeft' });
      expect(heading()).toBe('כותרת 1');
      fireEvent.keyDown(screen.getByTestId('blog-carousel'), { key: 'ArrowRight' });
      expect(heading()).toBe('כותרת 3');
      expect(screen.getByRole('button', { name: 'blog.play' })).toBeTruthy();
      // Only the front picture is reachable.
      const plates = screen.getAllByTestId('carousel-plate');
      expect(plates.filter((p) => p.getAttribute('aria-hidden') === 'false')).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('spreads its side pictures by its width', () => {
    expect(gapFor(400)).toBe(60);
    expect(gapFor(1456)).toBe(86);
    expect(gapFor(1240)).toBeCloseTo(73, 0);
  });
});

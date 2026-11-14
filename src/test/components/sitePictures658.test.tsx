import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BlogSection from '../../components/blog/BlogSection';
import PostPage from '../../components/blog/PostPage';
import { PostCover } from '../../components/blog/BlogParts';
import { SitePicturesContext, sitePicturesOf, standInCover, type SitePictures } from '../../services/sitePictures';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import type { Post, PostCard } from '../../models/Post';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
}));

/**
 * LT-658 (Erel 2026-11-14: "the pictures in the blog's posts can be any of the
 * existing pictures, only not empty"): a post with no picture of its own shows
 * one of the site's, the same one wherever it is drawn; its own cover wins; a
 * site with no picture keeps the letter.
 */
const card = (i: number, extra: Partial<PostCard> = {}): PostCard => ({
  id: `sample-post-${i}`, slug: `sample-post-${i}`, title: `פוסט ${i}`, summary: 'שורה', category: 'חדשות',
  publishedAt: '2026-11-14T10:00:00.000Z', updatedAt: '2026-11-14T10:00:00.000Z', minutes: 1, ...extra,
});
const site: SitePictures = { pictures: ['https://x/g0.jpg', 'https://x/g1.jpg', 'https://x/hero.jpg'], order: ['sample-post-0', 'sample-post-1', 'sample-post-2'] };
const srcs = (root: HTMLElement) => [...root.querySelectorAll('img')].map((img) => img.getAttribute('src') ?? '');

describe("a site's pictures", () => {
  it('are the gallery, the hero, the products and the services, each once, never a video or a logo', () => {
    const found = sitePicturesOf({
      components: {
        hero: { heroImageSrc: 'https://x/hero.jpg' },
        portfolio: { items: [{ url: 'https://x/g0.jpg' }, { url: 'https://x/clip.mp4' }, null, { url: 'https://x/hero.jpg' }, { url: '' }] },
      },
      products: { items: [{ images: [{ url: 'https://x/p0.jpg' }, { url: 'https://x/p0b.jpg' }] }, { images: [] }] },
      appointmentTypes: [{ image: 'service.webp' }, { image: undefined }],
      blog: { latest: [{ slug: 'a' }, { slug: 'b' }] },
    });
    expect(found.pictures).toEqual(['https://x/g0.jpg', 'https://x/hero.jpg', 'https://x/p0.jpg', 'service.webp']);
    expect(found.order).toEqual(['a', 'b']);
  });

  it('are none for a config with no picture, and for no config', () => {
    expect(sitePicturesOf({}).pictures).toEqual([]);
    expect(sitePicturesOf(null)).toEqual({ pictures: [], order: [] });
  });

  it("are read from a build's config as the site parses it", () => {
    const raw = structuredClone(RAW_AI_RESPONSE_SHAPE) as Record<string, any>;
    raw.components.hero.heroImageSrc = 'https://x/hero.jpg';
    raw.blog = { total: 2, latest: [card(0), card(1)] };
    const found = sitePicturesOf(WebsiteConfig.fromJSON(raw));
    expect(found.pictures).toContain('https://x/hero.jpg');
    expect(found.order).toEqual(['sample-post-0', 'sample-post-1']);
  });
});

describe('the picture of a post with no cover', () => {
  it('differs between the newest posts and is the same wherever a post is drawn', () => {
    const picked = [0, 1, 2].map((i) => standInCover(card(i), site));
    expect(new Set(picked).size).toBe(3);
    expect(standInCover(card(1), site)).toBe(picked[1]);
    // an older post, not among the newest: still one of the site's, and steady
    const older = standInCover(card(9), site);
    expect(site.pictures).toContain(older);
    expect(standInCover(card(9), site)).toBe(older);
  });

  it('is none on a site with no picture', () => {
    expect(standInCover(card(0), { pictures: [], order: [] })).toBeUndefined();
  });

  it("fills the home section's cards; a post's own cover stays", () => {
    const { container } = render(
      <SitePicturesContext.Provider value={site}>
        <BlogSection blog={{ total: 3, latest: [card(0), card(1, { cover: 'https://x/own.jpg' }), card(2)] }} businessName="עסק" />
      </SitePicturesContext.Provider>
    );
    const drawn = srcs(container);
    expect(drawn.some((src) => src.includes('g0.jpg'))).toBe(true);
    expect(drawn.some((src) => src.includes('own.jpg'))).toBe(true);
    expect(drawn.some((src) => src.includes('g1.jpg'))).toBe(false);
    expect(drawn.some((src) => src.includes('hero.jpg'))).toBe(true);
  });

  it('keeps the letter with no site picture, and when the picture does not load', () => {
    const { container, rerender } = render(<PostCover post={card(0)} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe('פ');
    rerender(<SitePicturesContext.Provider value={site}><PostCover post={card(0)} /></SitePicturesContext.Provider>);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toContain('g0.jpg');
    fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe('פ');
  });

  it("stands on the post's own page, in both looks", () => {
    const draft: Post = { ...card(2), body: [{ kind: 'p', text: 'גוף הפוסט.' }] };
    for (const layout of ['classic', 'wide'] as const) {
      const { container, unmount } = render(
        <SitePicturesContext.Provider value={site}>
          <PostPage slug={draft.slug} draft={draft} businessName="עסק" layout={layout} />
        </SitePicturesContext.Provider>
      );
      expect(screen.getByTestId('post-page').getAttribute('data-layout')).toBe(layout);
      expect(srcs(container).some((src) => src.includes('hero.jpg'))).toBe(true);
      unmount();
    }
  });

  it('leaves the wide look classic when neither the post nor the site has a picture', () => {
    const draft: Post = { ...card(0), body: [{ kind: 'p', text: 'גוף הפוסט.' }] };
    render(<PostPage slug={draft.slug} draft={draft} businessName="עסק" layout="wide" />);
    expect(screen.getByTestId('post-page').getAttribute('data-layout')).toBe('classic');
  });
});

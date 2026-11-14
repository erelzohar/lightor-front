import { describe, expect, it } from 'vitest';
import { parseBlog, previewPostsOf } from '../../models/Post';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

/**
 * LT-657: a wizard's build that was asked for a blog or news carries three
 * sample posts: `blog` (what the home section and the blog's page draw) and
 * `posts.items` (the whole posts), so the preview opens each on its own page
 * with nothing to fetch.
 */
const post = (i: number, body: unknown[] = [{ kind: 'p', text: `גוף ${i}` }]) => ({
  id: `sample-post-${i}`, slug: `sample-post-${i}`, title: `פוסט ${i}`, summary: 'שורה', category: 'חדשות',
  publishedAt: '2026-11-14T10:00:00.000Z', updatedAt: '2026-11-14T10:00:00.000Z', minutes: 1, body,
});

describe("a build's sample posts in the preview", () => {
  it('reads the whole posts, and drops what is no post', () => {
    const posts = previewPostsOf({ posts: { items: [post(0), post(1), { title: 'no id' }, post(2, []), 5, null] } });
    expect(posts.map((p) => p.slug)).toEqual(['sample-post-0', 'sample-post-1']);
    expect(posts[0].body).toEqual([{ kind: 'p', text: 'גוף 0' }]);
  });

  it('gives none for a real site, whose config has no posts', () => {
    expect(previewPostsOf({})).toEqual([]);
    expect(previewPostsOf(null)).toEqual([]);
    expect(previewPostsOf({ posts: 'x' })).toEqual([]);
    expect(previewPostsOf({ posts: { items: 'x' } })).toEqual([]);
  });

  it("the build's blog summary and heading are read like a real site's", () => {
    const cards = [post(0), post(1), post(2)].map(({ body: _body, ...card }) => card);
    expect(parseBlog({ total: 3, latest: cards })?.latest).toHaveLength(3);
    const config = WebsiteConfig.fromJSON({
      ...RAW_AI_RESPONSE_SHAPE,
      blog: { total: 3, latest: cards },
      posts: { items: [post(0), post(1), post(2)] },
      components: { ...(RAW_AI_RESPONSE_SHAPE as { components: Record<string, unknown> }).components, blog: { title: 'חדשות ועדכונים', description: 'כל מה שחדש' } },
    });
    expect(config.blog?.total).toBe(3);
    expect(config.components.blog.title).toBe('חדשות ועדכונים');
  });
});

import { describe, it, expect } from 'vitest';
import { awaitsPreviewData } from '../../services/previewMode';

const topLevel = (search: string) => {
  const win = { location: { search } } as { self?: unknown; top?: unknown; location: { search: string } };
  win.self = win;
  win.top = win;
  return win as unknown as Window;
};

const framed = (search: string) => ({ self: {}, top: {}, location: { search } }) as unknown as Window;

/**
 * Security I7 (LT-315): a crafted `?preview` link must not leave a live
 * site's visitors staring at an empty page. Only a framed page waits for the
 * editor's PREVIEW_DATA — plus, in a dev build, the local harness.
 */
describe('awaitsPreviewData', () => {
  it('waits inside the register and dashboard previews, which frame the site', () => {
    expect(awaitsPreviewData(framed(''), false)).toBe(true);
    expect(awaitsPreviewData(framed('?preview'), false)).toBe(true);
  });

  it('ignores ?preview on a top-level visit to the live site', () => {
    expect(awaitsPreviewData(topLevel('?preview'), false)).toBe(false);
    expect(awaitsPreviewData(topLevel('?preview=1&lang=he'), false)).toBe(false);
  });

  it('loads the site normally on a plain visit', () => {
    expect(awaitsPreviewData(topLevel(''), false)).toBe(false);
    expect(awaitsPreviewData(topLevel(''), true)).toBe(false);
  });

  it('still honours ?preview top-level in a dev build, for the local harness', () => {
    expect(awaitsPreviewData(topLevel('?preview'), true)).toBe(true);
  });
});

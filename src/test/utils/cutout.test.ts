import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * LT-317 — a round logo (see-through corners) is a cut-out, a photo is not;
 * an image that cannot be read stays a photo.
 */
let corners = 0; // the alpha the fake canvas reports at every pixel
let failLoad = false;
let lastCrossOrigin: string | null = null;
let copies: string[] = []; // every copy fetched

class FakeImage {
  crossOrigin: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(v: string) {
    copies.push(v);
    lastCrossOrigin = this.crossOrigin;
    setTimeout(() => (failLoad ? this.onerror?.() : this.onload?.()), 0);
  }
}

beforeEach(() => {
  vi.resetModules();
  failLoad = false;
  copies = [];
  vi.stubGlobal('Image', FakeImage);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => ({ drawImage: () => {}, getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4).map((_, i) => (i % 4 === 3 ? corners : 200)) }) }) as unknown as CanvasRenderingContext2D,
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('isCutout', () => {
  it('says yes for see-through corners, read from a CORS copy', async () => {
    corners = 0;
    const { isCutout } = await import('../../utils/cutout');
    await expect(isCutout('https://api.lightor.app/api/images/logo.webp')).resolves.toBe(true);
    expect(lastCrossOrigin).toBe('anonymous');
  });

  it('says no for a photo', async () => {
    corners = 255;
    const { isCutout } = await import('../../utils/cutout');
    await expect(isCutout('https://api.lightor.app/api/images/photo.jpg')).resolves.toBe(false);
  });

  it('says no when the copy cannot be loaded or read', async () => {
    failLoad = true;
    const { isCutout } = await import('../../utils/cutout');
    await expect(isCutout('https://elsewhere.example/x.png')).resolves.toBe(false);
    failLoad = false;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({ drawImage: () => {}, getImageData: () => { throw new DOMException('tainted', 'SecurityError'); } }) as unknown as CanvasRenderingContext2D);
    await expect(isCutout('https://elsewhere.example/y.png')).resolves.toBe(false);
    await expect(isCutout('')).resolves.toBe(false);
  });

  // LT-445: the copy is a second download of the page's largest picture.
  it('never fetches a copy of a picture that cannot be see-through', async () => {
    corners = 0;
    const { isCutout } = await import('../../utils/cutout');
    for (const src of [
      'https://api.lightor.app/packs/nails/1.jpg',
      'https://api.lightor.app/api/images/photo.JPEG?v=2',
      'https://picsum.photos/seed/hero/1280/720',
      'https://images.unsplash.com/photo-1?w=1200&fm=jpg',
      'data:image/jpeg;base64,AAAA',
    ]) await expect(isCutout(src)).resolves.toBe(false);
    expect(copies).toEqual([]);
    await expect(isCutout('data:image/png;base64,AAAA')).resolves.toBe(true);
    expect(copies).toHaveLength(1);
  });

  it("waits for the page's own picture to load before fetching the copy", async () => {
    corners = 0;
    const { isCutout } = await import('../../utils/cutout');
    const src = 'https://api.lightor.app/api/images/logo.webp';
    const shown = document.createElement('img');
    Object.defineProperty(shown, 'complete', { value: false, configurable: true });
    shown.setAttribute('src', src);
    document.body.appendChild(shown);
    const answer = isCutout(src);
    await new Promise((r) => setTimeout(r, 5));
    expect(copies).toEqual([]);
    shown.dispatchEvent(new Event('load'));
    await expect(answer).resolves.toBe(true);
    expect(copies).toEqual([src]);
    shown.remove();
  });
});

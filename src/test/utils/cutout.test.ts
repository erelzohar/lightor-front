import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * LT-317 — a round logo (see-through corners) is a cut-out, a photo is not;
 * an image that cannot be read stays a photo.
 */
let corners = 0; // the alpha the fake canvas reports at every pixel
let failLoad = false;
let lastCrossOrigin: string | null = null;

class FakeImage {
  crossOrigin: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_v: string) {
    lastCrossOrigin = this.crossOrigin;
    setTimeout(() => (failLoad ? this.onerror?.() : this.onload?.()), 0);
  }
}

beforeEach(() => {
  vi.resetModules();
  failLoad = false;
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
});

import { describe, it, expect, vi, beforeAll } from 'vitest';

/**
 * LT-485 (an error email from a site built in the app): Vanta's topology built
 * its flow grid once, at the size the background started at. Grown past that
 * (Vanta's own resize after the first frame, a phone's address bar, the
 * wizard's preview), every frame threw and the background froze. A stand-in
 * p5 runs the effect's own sketch: start small, grow, draw.
 */
class Vec {
  constructor(public x = 0, public y = 0) {}
  add(v?: Vec) { if (v) { this.x += v.x; this.y += v.y; } return this; }
  mult(n: number) { this.x *= n; this.y *= n; return this; }
  normalize() { const m = Math.hypot(this.x, this.y) || 1; this.x /= m; this.y /= m; return this; }
  static dist(a: Vec, b: Vec) { return Math.hypot(a.x - b.x, a.y - b.y); }
}

type Sketch = (p: Record<string, unknown>) => void;
let sketchOf: Record<string, any> | null = null;

class FakeP5 {
  static Vector = Vec;
  constructor(sketch: Sketch) {
    let seed = 1;
    const p: Record<string, any> = {
      width: 0,
      height: 0,
      TAU: Math.PI * 2,
      createCanvas: (w: number, h: number) => { p.width = w; p.height = h; p.canvas = document.createElement('canvas'); return { parent: () => {} }; },
      resizeCanvas: (w: number, h: number) => { p.width = w; p.height = h; },
      random: (n: number) => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647) * n; },
      createVector: (x = 0, y = 0) => new Vec(x, y),
      noise: (x: number, y: number) => (Math.sin(x * 12.9898 + y * 78.233) + 1) / 2,
      cos: Math.cos, sin: Math.sin, floor: Math.floor,
      constrain: (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v)),
      smooth() {}, noStroke() {}, translate() {}, strokeWeight() {}, stroke() {}, line() {}, remove() {},
    };
    sketch(p);
    sketchOf = p;
  }
}

const growAndDraw = async (load: () => Promise<{ default: (opts: object) => unknown }>) => {
  sketchOf = null;
  const el = document.createElement('div');
  document.body.appendChild(el);
  Object.defineProperty(el, 'offsetWidth', { configurable: true, value: 390 });
  Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 500 });
  const effect = (await load()).default({ el, p5: FakeP5, minHeight: 200, minWidth: 200, color: 0x7c3aed, backgroundColor: 0x0b0b12 }) as { resize: () => void; destroy: () => void };
  const p = sketchOf!;
  p.setup();
  for (let i = 0; i < 20; i++) p.draw();
  // The background grows to more than twice its height, as Vanta's resize leaves it.
  Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 1300 });
  effect.resize();
  expect(p.height).toBe(1300);
  let error: unknown = null;
  try {
    for (let i = 0; i < 400; i++) p.draw();
  } catch (e) {
    error = e;
  }
  effect.destroy();
  return error;
};

beforeAll(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
});

describe('the topology background', () => {
  it('keeps drawing after its background grows past the size it started at', async () => {
    expect(await growAndDraw(() => import('../../components/Layout/vantaTopology'))).toBeNull();
  });

  it("is what Vanta's own effect fails at (the control)", async () => {
    // @ts-expect-error - Vanta ships no types
    expect(await growAndDraw(() => import('vanta/src/vanta.topology.js'))).toBeInstanceOf(TypeError);
  });
});

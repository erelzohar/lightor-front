import { describe, expect, it } from 'vitest';
import { coverBox, measureCurve, nearestAt, pad2, releaseTarget, rubber, scaleAt, spring, stringY, swingStep } from '../../../components/gallery/motion';

describe('the springs', () => {
  it('settle on the target, even over long frames', () => {
    let x = 0; let v = 0;
    for (let i = 0; i < 300; i++) [x, v] = spring(x, v, 100, 8.4, 1, 0.05);
    expect(x).toBeCloseTo(100, 3);
    expect(v).toBeCloseTo(0, 3);
  });
});

describe('the clothesline', () => {
  it('sags in the middle and is tied at both ends', () => {
    expect(stringY(0, 1000, 30, 40)).toBe(30);
    expect(stringY(1000, 1000, 30, 40)).toBe(30);
    expect(stringY(500, 1000, 30, 40)).toBe(70);
  });

  it('swings a print against the line, and the swing dies out', () => {
    let a = 0; let w = 0;
    [a, w] = swingStep(a, w, 2000, 0.016);
    expect(a).toBeGreaterThan(0);
    for (let i = 0; i < 400; i++) [a, w] = swingStep(a, w, 0, 0.016);
    expect(Math.abs(a)).toBeLessThan(0.002);
  });

  it('never swings a print past its limit', () => {
    let a = 0; let w = 0;
    for (let i = 0; i < 200; i++) [a, w] = swingStep(a, w, 100000, 0.016);
    expect(Math.abs(a)).toBeLessThanOrEqual(0.6);
  });

  it('finds the print at the centre, and stays on the line past its ends', () => {
    expect(nearestAt(324 * 2 + 10, 324, 6)).toBe(2);
    expect(nearestAt(-500, 324, 6)).toBe(0);
    expect(nearestAt(99999, 324, 6)).toBe(5);
  });

  it('counts with two digits', () => {
    expect(pad2(3)).toBe('03');
    expect(pad2(12)).toBe('12');
  });
});

describe('the cascade', () => {
  it('shrinks a card a step away, and no further', () => {
    expect(scaleAt(0, 0.6)).toBe(1);
    expect(scaleAt(1, 0.6)).toBeCloseTo(0.6);
    expect(scaleAt(-4, 0.6)).toBeCloseTo(0.6);
  });

  it('follows a drag past the ends at a third of the speed', () => {
    expect(rubber(-3, 6)).toBe(-1);
    expect(rubber(8, 6)).toBe(6);
    expect(rubber(2.5, 6)).toBe(2.5);
  });

  it('carries a flick, at most three cards, inside the list', () => {
    expect(releaseTarget(2.2, 0, 6)).toBe(2);
    expect(releaseTarget(2, 10, 6)).toBe(4);
    expect(releaseTarget(0.4, 100, 12)).toBe(3);
    expect(releaseTarget(4.8, 100, 6)).toBe(5);
    expect(releaseTarget(0.2, -100, 6)).toBe(0);
  });
});

describe('the curve', () => {
  const WIDTHS: [number, number, number, number][] = [[390, 240, 0.5, 62], [768, 322, 0.38, 80], [1280, 537, 0.38, 80], [2560, 544, 0.38, 80]];

  it.each(WIDTHS)('wraps a tile only out of sight at %i px', (w, h, share, bend) => {
    const l = measureCurve(w, h, share, 16 / 9, 0.06, bend)!;
    // Past this angle the whole tile is beyond the band's edge.
    expect(l.sweep).toBeGreaterThanOrEqual(bend + ((16 / 9) * l.unit) / 2);
    expect(Number.isInteger(l.columns)).toBe(true);
  });

  it('leaves a phone room for the next tile', () => {
    const l = measureCurve(390, 240, 0.5, 16 / 9, 0.06, 62)!;
    expect(l.tile * (16 / 9)).toBeLessThanOrEqual(390 * 0.55 + 0.01);
  });

  it('draws nothing in a band with no size', () => {
    expect(measureCurve(0, 0, 0.38, 16 / 9, 0.06, 80)).toBeNull();
  });

  it('crops a picture like object-fit: cover', () => {
    expect(coverBox(1000, 1000, 160, 90)).toEqual({ w: 160, h: 160, x: 0, y: -35 });
    expect(coverBox(1600, 900, 160, 90)).toEqual({ w: 160, h: 90, x: 0, y: 0 });
  });
});

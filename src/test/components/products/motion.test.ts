import { describe, expect, it } from 'vitest';
import {
  along, beltFrames, fitBelt, fitRail, frontOf, lapsToFront, makeBelt, plateAtFront, railTargets, ringOffset,
} from '../../../components/products/motion';

describe('the belt (LT-540)', () => {
  it('closes its loop: the last frame of a lap is the first', () => {
    const frames = beltFrames(makeBelt(900, 8, 120, 0.68), false);
    expect(frames[0]).toEqual(frames[frames.length - 1]);
  });

  it('runs the other way on a right-to-left page', () => {
    const g = makeBelt(900, 8, 120, 0.68);
    const x = (f: { transform: string }) => Number(/translate3d\(([-\d.]+)px/.exec(f.transform)![1]);
    const ltr = beltFrames(g, false);
    const rtl = beltFrames(g, true);
    expect(x(ltr[1])).toBeLessThan(x(ltr[0]));
    expect(x(rtl[1])).toBeGreaterThan(x(rtl[0]));
  });

  it('keeps the middle of the front lane at the front of the loop', () => {
    const g = makeBelt(900, 8, 120, 0.68);
    const p = along(g, frontOf(g) * g.l);
    expect(p.x).toBeCloseTo(0);
    expect(p.z).toBe(g.r);
  });

  it('never makes a plate too small to tap, a phone showing the middle of a larger belt', () => {
    expect(fitBelt(358, 8).d).toBeGreaterThanOrEqual(96);
    expect(fitBelt(1400, 8).d).toBeLessThanOrEqual(150);
  });

  it('finds the plate at the front and the short way to bring another there', () => {
    expect(plateAtFront(0, 8, 0)).toBe(0);
    expect(plateAtFront(1 / 8, 8, 0)).toBe(1);
    expect(lapsToFront(0, 1, 8, 0)).toBeCloseTo(1 / 8);
    expect(lapsToFront(0, 7, 8, 0)).toBeCloseTo(-1 / 8);
  });
});

describe('the rail (LT-540)', () => {
  it('goes one at a time when a row would be too small to read', () => {
    expect(fitRail(358, 8).carousel).toBe(true);
    expect(fitRail(1200, 8).carousel).toBe(false);
  });

  it('makes room around the piece that faces the visitor', () => {
    const rest = railTargets(5, 300, 1200, false, null);
    const turned = railTargets(5, 300, 1200, false, 2);
    expect(turned[3] - turned[2]).toBeGreaterThan(rest[3] - rest[2]);
  });

  it('centres the piece in front on a phone', () => {
    expect(railTargets(5, 300, 358, true, 3)[3]).toBe(179);
  });
});

describe('the coverflow (LT-540)', () => {
  it('goes the short way round the ring', () => {
    expect(ringOffset(0, 0, 6)).toBe(0);
    expect(ringOffset(1, 0, 6)).toBe(1);
    expect(ringOffset(5, 0, 6)).toBe(-1);
  });
});

import { describe, it, expect } from 'vitest';
import { pickBandSlot } from '../../services/bandSlot';

describe('pickBandSlot (LT-119)', () => {
  const keys = ['hero', 'about', 'portfolio', 'testimonials', 'schedule', 'faq', 'contact'];

  it('never lands directly above or below the schedule, nor before the hero', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const slot = pickBandSlot(keys, i / 200);
      expect(slot).not.toBeNull();
      expect(slot).not.toBe(0);
      expect(slot).not.toBe(4); // above schedule
      expect(slot).not.toBe(5); // below schedule
      seen.add(slot as number);
    }
    // Every legal slot is reachable: after hero/about/portfolio, after faq, after contact.
    expect([...seen].sort((a, b) => a - b)).toEqual([1, 2, 3, 6, 7]);
  });

  it('is deterministic for a given draw', () => {
    expect(pickBandSlot(keys, 0.37)).toBe(pickBandSlot(keys, 0.37));
  });

  it('returns null when only the forbidden slots exist', () => {
    expect(pickBandSlot(['hero', 'schedule'], 0.5)).toBeNull();
  });

  it('tolerates a bad draw value', () => {
    expect(pickBandSlot(keys, NaN)).toBe(1);
    expect(pickBandSlot(keys, 1)).toBe(7);
  });
});

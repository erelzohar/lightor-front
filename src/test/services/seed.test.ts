import { describe, it, expect } from 'vitest';
import { getSiteJitter, createRng } from '../../services/seed';

describe('getSiteJitter', () => {
  it('is deterministic for the same subdomain', () => {
    expect(getSiteJitter('dana-hair')).toEqual(getSiteJitter('dana-hair'));
  });

  it('differs between subdomains', () => {
    const a = getSiteJitter('dana-hair');
    const b = getSiteJitter('yossi-barber');
    // Not every field must differ (booleans collide half the time), but the
    // continuous draws make identical bundles astronomically unlikely.
    expect(a).not.toEqual(b);
  });

  it('separates near-identical subdomains', () => {
    expect(getSiteJitter('dana')).not.toEqual(getSiteJitter('dana2'));
  });

  it('tolerates a missing subdomain with a stable fallback', () => {
    expect(getSiteJitter(undefined)).toEqual(getSiteJitter(null));
    expect(getSiteJitter(undefined)).toEqual(getSiteJitter(''));
  });

  it('keeps every value inside its documented bounds', () => {
    for (const sub of ['a', 'demo', 'some-very-long-business-name', 'שם-בעברית']) {
      const j = getSiteJitter(sub);
      j.blobOffsets.forEach((o) => { expect(o).toBeGreaterThanOrEqual(-10); expect(o).toBeLessThanOrEqual(10); });
      expect(j.floatDuration).toBeGreaterThanOrEqual(4.5);
      expect(j.floatDuration).toBeLessThanOrEqual(6.5);
      expect([0, 1, 2]).toContain(j.masonryPhase);
      expect(Number.isInteger(j.particleSeed)).toBe(true);
      expect(typeof j.flipAboutSplit).toBe('boolean');
      expect(typeof j.mirrorDividers).toBe('boolean');
    }
  });

  // The jitter must actually jitter: across a population of subdomains both
  // boolean branches occur, so same-preset sites genuinely split.
  it('spreads booleans across a population', () => {
    const subs = Array.from({ length: 40 }, (_, i) => `site-${i}`);
    const flips = subs.map((s) => getSiteJitter(s).flipAboutSplit);
    expect(flips).toContain(true);
    expect(flips).toContain(false);
  });
});

describe('createRng', () => {
  it('yields the same stream for the same seed', () => {
    const a = createRng(42), b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

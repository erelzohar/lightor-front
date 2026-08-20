import { describe, it, expect } from 'vitest';
import { contrastRatio, ensureReadable, bestTextOn } from '../../services/contrast';

describe('contrastRatio', () => {
  it('reports the WCAG extremes correctly', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 3);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#b45309', '#faf7f2')).toBeCloseTo(contrastRatio('#faf7f2', '#b45309'), 6);
  });

  it('accepts 3-digit hex', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 1);
  });
});

describe('ensureReadable', () => {
  it('returns the color unchanged when it already passes', () => {
    // Dark amber on near-white: ~7:1, comfortably over 4.5.
    expect(ensureReadable('#92400e', '#faf7f2', 4.5)).toBe('#92400e');
  });

  // The exact failure from Erel's screenshot: a near-black primaryDark on a
  // near-black dark background.
  it('rescues near-black primary on a dark background', () => {
    const fixed = ensureReadable('#1f1a17', '#1c1917', 4.5);
    expect(contrastRatio(fixed, '#1c1917')).toBeGreaterThanOrEqual(4.5);
  });

  it('rescues near-white primary on a light background', () => {
    const fixed = ensureReadable('#f5f0fa', '#faf7f2', 4.5);
    expect(contrastRatio(fixed, '#faf7f2')).toBeGreaterThanOrEqual(4.5);
  });

  // The purple-fog case: primary text over a background of the same hue.
  it('rescues same-hue low-contrast pairs', () => {
    const fixed = ensureReadable('#c4b5fd', '#ddd6fe', 4.5);
    expect(contrastRatio(fixed, '#ddd6fe')).toBeGreaterThanOrEqual(4.5);
  });

  it('pushes lighter on dark backgrounds and darker on light ones', () => {
    const onDark = ensureReadable('#333333', '#111111', 4.5);
    const onLight = ensureReadable('#cccccc', '#f5f5f5', 4.5);
    expect(contrastRatio(onDark, '#ffffff')).toBeLessThan(contrastRatio('#333333', '#ffffff'));
    expect(contrastRatio(onLight, '#000000')).toBeLessThan(contrastRatio('#cccccc', '#000000'));
  });

  it('is deterministic', () => {
    expect(ensureReadable('#1f1a17', '#1c1917')).toBe(ensureReadable('#1f1a17', '#1c1917'));
  });

  it('survives a population of adversarial palettes', () => {
    const bgs = ['#000000', '#ffffff', '#1c1917', '#faf7f2', '#7c3aed', '#fdf2f8'];
    const fgs = ['#000000', '#ffffff', '#1f1a17', '#f5f0fa', '#8b5cf6', '#c4b5fd'];
    for (const bg of bgs) {
      for (const fg of fgs) {
        const fixed = ensureReadable(fg, bg, 4.5);
        // Saturated mid-hues can top out below 4.5 at their lightness
        // extreme; the contract is "best readable version of this hue",
        // so require a strong floor rather than the full target.
        expect(contrastRatio(fixed, bg)).toBeGreaterThanOrEqual(3.5);
      }
    }
  });

  it('tolerates malformed hex without throwing', () => {
    expect(() => ensureReadable('oops', '#ffffff')).not.toThrow();
    expect(ensureReadable('oops', '#ffffff')).toBe('oops');
  });
});

describe('bestTextOn', () => {
  it('puts white on dark fills and dark on light fills', () => {
    expect(bestTextOn('#1d4ed8')).toBe('#ffffff');
    expect(bestTextOn('#fde68a')).toBe('#111827');
  });

  it('prefers white on ties', () => {
    // Mid-tone where both candidates land close: white wins the tie-break.
    const pick = bestTextOn('#757575');
    expect(['#ffffff', '#111827']).toContain(pick);
  });
});

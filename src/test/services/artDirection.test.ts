import { describe, it, expect } from 'vitest';
import { scaleOf, spacingOf, pickInvert, pickInterludeSlot, SPACING_CLASS } from '../../services/artDirection';
import { getSiteJitter } from '../../services/seed';

describe('art direction (LT-131)', () => {
  it('gives each section its own heading scale and spacing from the site seed', () => {
    const j = getSiteJitter('barber-one');
    const keys = ['about', 'services', 'portfolio', 'testimonials', 'schedule', 'faq', 'contact'];
    for (const k of keys) {
      expect(['giant', 'normal', 'micro']).toContain(scaleOf(k, j));
      expect(['tight', 'normal', 'huge']).toContain(spacingOf(k, j));
    }
    expect(scaleOf('hero', j)).toBeUndefined();
    expect(spacingOf('booking-band', j)).toBe('normal');
    expect(SPACING_CLASS.normal).toBe('');
  });

  it('varies across sites', () => {
    const sigs = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const j = getSiteJitter(`site-${i}`);
      sigs.add(['about', 'portfolio', 'faq'].map((k) => `${scaleOf(k, j)}/${spacingOf(k, j)}`).join('|'));
    }
    expect(sigs.size).toBeGreaterThan(10);
  });

  it('inverts one middle section, never a backdrop one, never the hero/schedule', () => {
    const keys = ['hero', 'about', 'portfolio', 'schedule', 'faq', 'contact'];
    for (let i = 0; i < 20; i++) {
      const pick = pickInvert(keys, i / 20, new Set(['about']));
      expect(['portfolio', 'faq']).toContain(pick);
    }
    expect(pickInvert(['hero', 'schedule'], 0.3, new Set())).toBeNull();
  });

  it('places the interlude after a middle section only', () => {
    const keys = ['hero', 'about', 'portfolio', 'schedule', 'faq', 'contact'];
    for (let i = 0; i < 20; i++) {
      expect([2, 3]).toContain(pickInterludeSlot(keys, i / 20));
    }
    expect(pickInterludeSlot(['hero', 'schedule'], 0.5)).toBeNull();
  });
});

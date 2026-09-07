import { describe, it, expect } from 'vitest';
import { navLinksFromBlocks } from '../../services/navLinks';

describe('navLinksFromBlocks (LT-137)', () => {
  it('links only to blocks that exist, in page order', () => {
    const links = navLinksFromBlocks([
      { id: 'b1', type: 'hero' }, { id: 'b2', type: 'manifesto' }, { id: 'b3', type: 'gallery' },
      { id: 'b4', type: 'priceCards' }, { id: 'b5', type: 'schedule' }, { id: 'b6', type: 'contact' }, { id: 'b7', type: 'footer' },
    ]);
    expect(links.map((l) => l.href)).toEqual(['#portfolio', '#services', '#schedule', '#contact']);
  });

  it('points About at the features block when the intro is absent, and dedupes', () => {
    const links = navLinksFromBlocks([{ id: 'b1', type: 'features' }, { id: 'b2', type: 'intro' }, { id: 'b3', type: 'schedule' }]);
    expect(links.map((l) => l.href)).toEqual(['#about', '#schedule']);
    expect(navLinksFromBlocks([{ id: 'x', type: 'intro' }, { id: 'y', type: 'features' }]).map((l) => l.href)).toEqual(['#about']);
  });

  it('caps at five, keeping booking and contact', () => {
    const links = navLinksFromBlocks(['intro', 'gallery', 'ledger', 'faq', 'schedule', 'contact'].map((type, i) => ({ id: `b${i}`, type })));
    expect(links.length).toBe(5);
    expect(links.map((l) => l.href)).toContain('#schedule');
    expect(links.map((l) => l.href)).toContain('#contact');
  });
});

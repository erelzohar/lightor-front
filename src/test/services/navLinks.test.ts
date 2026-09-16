import { describe, it, expect } from 'vitest';
import { navLinksFromBlocks, sectionTitlesOf } from '../../services/navLinks';

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

  it('carries the section titles as labels, generic where a section has none (LT-168)', () => {
    const blocks = ['intro', 'gallery', 'ledger', 'schedule', 'faq', 'contact'].map((type, i) => ({ id: `b${i}`, type }));
    const links = navLinksFromBlocks(blocks, { about: ' הסיפור המתוק שלנו ', portfolio: '', schedule: 'הזמנת מארזים', contact: 'צרו קשר להזמנות' });
    const byHref = Object.fromEntries(links.map((l) => [l.href, l.title]));
    expect(byHref['#about']).toBe('הסיפור המתוק שלנו');
    expect(byHref['#portfolio']).toBeUndefined();
    expect(byHref['#services']).toBeUndefined();
    expect(byHref['#schedule']).toBe('הזמנת מארזים');
    expect(byHref['#faq']).toBeUndefined();
    expect(navLinksFromBlocks(blocks).every((l) => l.title === undefined)).toBe(true);
    expect(sectionTitlesOf({ about: { title: '  ' }, faq: { title: 'שאלות נפוצות' } })).toEqual({ about: undefined, portfolio: undefined, schedule: undefined, faq: 'שאלות נפוצות', contact: undefined });
    expect(sectionTitlesOf(undefined)).toEqual({ about: undefined, portfolio: undefined, schedule: undefined, faq: undefined, contact: undefined });
  });

  it('caps at five, keeping booking and contact', () => {
    const links = navLinksFromBlocks(['intro', 'gallery', 'ledger', 'faq', 'schedule', 'contact'].map((type, i) => ({ id: `b${i}`, type })));
    expect(links.length).toBe(5);
    expect(links.map((l) => l.href)).toContain('#schedule');
    expect(links.map((l) => l.href)).toContain('#contact');
  });
});

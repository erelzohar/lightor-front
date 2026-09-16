import { describe, it, expect } from 'vitest';
import { stampTextFor } from '../../services/heroStamp';

/** LT-174 — the stamp decor says something the title does not. */
describe('stampTextFor', () => {
  it('prefers the AI-written stamp line', () => {
    expect(stampTextFor({ title: 'Authentic Game Jerseys', subtitle: 'Since 2019', stamp: 'Worn by pros' }, 'Pro NBA Kits')).toBe('Worn by pros');
  });
  it('falls back to a subtitle that differs from the title, then the business name', () => {
    expect(stampTextFor({ title: 'Authentic Game Jerseys', subtitle: 'Since 2019' }, 'Pro NBA Kits')).toBe('Since 2019');
    expect(stampTextFor({ title: 'Authentic Game Jerseys', subtitle: '' }, 'Pro NBA Kits')).toBe('Pro NBA Kits');
  });
  it('never repeats the title, whatever the punctuation or case', () => {
    expect(stampTextFor({ title: 'Authentic Game Jerseys', subtitle: 'authentic game jerseys.', stamp: 'AUTHENTIC GAME JERSEYS!' }, 'Pro NBA Kits')).toBe('Pro NBA Kits');
    expect(stampTextFor({ title: 'רגעים מתוקים', subtitle: 'רגעים מתוקים!' }, 'רגעים מתוקים')).toBe('');
  });
});

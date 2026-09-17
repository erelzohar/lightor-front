import { describe, it, expect } from 'vitest';
import { whatsAppHref, whatsAppNumber } from '../../utils/phone';

/** LT-177 — every WhatsApp link on the site goes through this. */
describe('WhatsApp links', () => {
  it('gives a local Israeli number its country code', () => {
    expect(whatsAppHref('0508801872')).toBe('https://wa.me/972508801872');
  });

  it('leaves a number already in international form alone', () => {
    expect(whatsAppHref('+972508801872')).toBe('https://wa.me/972508801872');
    expect(whatsAppHref('972508801872')).toBe('https://wa.me/972508801872');
  });

  it('never puts a plus, a dash or a space in the link', () => {
    expect(whatsAppHref('050-880 1872')).toBe('https://wa.me/972508801872');
    expect(whatsAppHref('+972 50-880-1872')).toBe('https://wa.me/972508801872');
  });

  it('matches the dashboard for the same number', () => {
    // lightor-dashboard src/tests/utils/phone.test.ts asserts these exact links.
    expect(whatsAppHref('0584006014')).toBe('https://wa.me/972584006014');
    expect(whatsAppHref('+972584006014')).toBe('https://wa.me/972584006014');
    expect(whatsAppHref('058-400-6014')).toBe('https://wa.me/972584006014');
  });

  it('does not throw on a missing number', () => {
    expect(whatsAppNumber(undefined)).toBe('');
    expect(whatsAppNumber(null)).toBe('');
  });
});

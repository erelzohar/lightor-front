import { describe, it, expect } from 'vitest';
import { displayPhone, isMobile, telHref, toE164, whatsAppHref, whatsAppNumber } from '../../utils/phone';

/**
 * LT-177 / LT-404 - every call link, WhatsApp link and phone shown on a site
 * goes through these helpers. The backend stores E.164 after its backfill, but
 * a legacy value may still be in any shape the owner typed.
 */

describe('toE164', () => {
  it.each([
    // Already E.164.
    ['+972501234567', '+972501234567'],
    ['+97231234567', '+97231234567'],
    // Local Israeli forms.
    ['0501234567', '+972501234567'],
    ['050-123 4567', '+972501234567'],
    ['050-880-1872', '+972508801872'],
    ['(050) 123-4567', '+972501234567'],
    ['  0501234567  ', '+972501234567'],
    ['03-1234567', '+97231234567'],
    ['021234567', '+97221234567'],
    ['077-1234567', '+972771234567'],
    ['501234567', '+972501234567'],
    // Country code without a plus.
    ['972501234567', '+972501234567'],
    ['9720501234567', '+972501234567'],
    ['97231234567', '+97231234567'],
    // A trunk 0 kept after the country code.
    ['+972 050-1234567', '+972501234567'],
    ['+9720501234567', '+972501234567'],
    // International prefix 00.
    ['00972501234567', '+972501234567'],
    ['00 972 50 123 4567', '+972501234567'],
    ['0014155551234', '+14155551234'],
    // Foreign numbers stay as they are.
    ['+14155551234', '+14155551234'],
    ['+1 (415) 555-1234', '+14155551234'],
    ['+447911123456', '+447911123456'],
  ])('%s -> %s', (raw, expected) => {
    expect(toE164(raw)).toBe(expected);
  });

  it.each([
    [''],
    ['   '],
    ['abc'],
    ['12345'],
    ['050123'],
    ['14155551234'],
    ['+1234567'],
    ['+1234567890123456'],
    ['050123456789'],
  ])('%j -> null', (raw) => {
    expect(toE164(raw)).toBeNull();
  });

  it('does not throw on a missing number', () => {
    expect(toE164(undefined)).toBeNull();
    expect(toE164(null)).toBeNull();
  });
});

describe('isMobile', () => {
  it.each([
    ['+972501234567', true],
    ['0501234567', true],
    ['058-400-6014', true],
    ['972521234567', true],
    ['+14155551234', true], // foreign: we cannot tell, WhatsApp allowed
    ['+447911123456', true],
    ['02-1234567', false],
    ['03-1234567', false],
    ['04-1234567', false],
    ['08-1234567', false],
    ['09-1234567', false],
    ['077-1234567', false],
    ['072-1234567', false],
    ['+97231234567', false],
    ['', false],
    ['abc', false],
    [undefined, false],
  ])('%j -> %s', (raw, expected) => {
    expect(isMobile(raw)).toBe(expected);
  });
});

describe('telHref', () => {
  it.each([
    ['+972501234567', 'tel:+972501234567'],
    ['050-123 4567', 'tel:+972501234567'],
    ['972501234567', 'tel:+972501234567'],
    ['+972 050-1234567', 'tel:+972501234567'],
    ['00972501234567', 'tel:+972501234567'],
    ['03-1234567', 'tel:+97231234567'],
    ['+14155551234', 'tel:+14155551234'],
    // Unparseable: the digits and plus as typed.
    ['*2700', 'tel:2700'],
    ['1-800-123-456', 'tel:1800123456'],
    [undefined, 'tel:'],
  ])('%j -> %s', (raw, expected) => {
    expect(telHref(raw)).toBe(expected);
  });
});

describe('whatsAppHref', () => {
  it.each([
    ['0508801872', 'https://wa.me/972508801872'],
    ['+972508801872', 'https://wa.me/972508801872'],
    ['972508801872', 'https://wa.me/972508801872'],
    ['050-880 1872', 'https://wa.me/972508801872'],
    ['+972 50-880-1872', 'https://wa.me/972508801872'],
    ['+972 050-880-1872', 'https://wa.me/972508801872'],
    ['00972508801872', 'https://wa.me/972508801872'],
    ['+14155551234', 'https://wa.me/14155551234'],
  ])('%j -> %s', (raw, expected) => {
    expect(whatsAppHref(raw)).toBe(expected);
  });

  it('matches the dashboard for the same number', () => {
    // lightor-dashboard src/tests/utils/phone.test.ts asserts these exact links.
    expect(whatsAppHref('0584006014')).toBe('https://wa.me/972584006014');
    expect(whatsAppHref('+972584006014')).toBe('https://wa.me/972584006014');
    expect(whatsAppHref('058-400-6014')).toBe('https://wa.me/972584006014');
  });

  it.each([['03-1234567'], ['+97221234567'], ['077-1234567'], [''], ['abc'], [null], [undefined]])(
    'no link for a landline or an unparseable number: %j',
    (raw) => {
      expect(whatsAppHref(raw)).toBeNull();
    },
  );

  it('carries an optional prefilled message', () => {
    expect(whatsAppHref('0501234567', 'Hi, a question')).toBe('https://wa.me/972501234567?text=Hi%2C%20a%20question');
  });

  it('whatsAppNumber gives the E.164 digits, or nothing', () => {
    expect(whatsAppNumber('050-123 4567')).toBe('972501234567');
    expect(whatsAppNumber(undefined)).toBe('');
    expect(whatsAppNumber(null)).toBe('');
  });
});

describe('displayPhone', () => {
  it.each([
    ['+972501234567', '050-1234567'],
    ['0501234567', '050-1234567'],
    ['050-123 4567', '050-1234567'],
    ['972501234567', '050-1234567'],
    ['+972 050-1234567', '050-1234567'],
    ['00972501234567', '050-1234567'],
    ['+972771234567', '077-1234567'],
    ['072-1234567', '072-1234567'],
    ['+97231234567', '03-1234567'],
    ['021234567', '02-1234567'],
    ['04 123 4567', '04-1234567'],
    ['+97281234567', '08-1234567'],
    ['+97291234567', '09-1234567'],
    // Foreign: the E.164 as is.
    ['+14155551234', '+14155551234'],
    ['+1 (415) 555-1234', '+14155551234'],
    // Unparseable: as typed, trimmed.
    ['  *2700 ', '*2700'],
    ['abc', 'abc'],
    ['', ''],
    [undefined, ''],
  ])('%j -> %j', (raw, expected) => {
    expect(displayPhone(raw)).toBe(expected);
  });

  it('never shows an em-dash', () => {
    expect(displayPhone('+972501234567')).not.toContain('\u2014');
  });
});

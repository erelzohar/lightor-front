import { describe, it, expect } from 'vitest';
import {
  PHONE_COUNTRIES,
  dialCode,
  displayPhone,
  isMobile,
  isPhoneCountry,
  phoneCountryOf,
  phoneEntryOf,
  phoneExample,
  phoneExampleInText,
  readPhone,
  retypePhone,
  siteCountry,
  telHref,
  toE164,
  typePhone,
  whatsAppHref,
} from '../../utils/phone';

/**
 * LT-677 - numbers abroad without a phone library: one small table of
 * countries (Israel, the US), and what a phone field does with it. The
 * Israeli rules are the ones the forms always had, and with Israel alone on
 * offer a field types and reads exactly as before.
 */

describe('the countries this app knows', () => {
  it('are Israel and the US, Israel first', () => {
    expect(PHONE_COUNTRIES).toEqual(['IL', 'US']);
    expect(dialCode('IL')).toBe('972');
    expect(dialCode('US')).toBe('1');
    expect(phoneExample('US')).toBe('(212) 555-0123');
    expect(isPhoneCountry('US')).toBe(true);
    expect(isPhoneCountry('CA')).toBe(false);
    expect(isPhoneCountry('toString')).toBe(false);
    expect(isPhoneCountry(undefined)).toBe(false);
  });
});

describe('toE164 with the country a local number is read in', () => {
  it.each([
    ['(212) 555-0123', '+12125550123'],
    ['212-555-0123', '+12125550123'],
    ['212.555.0123', '+12125550123'],
    ['2125550123', '+12125550123'],
    ['1 212 555 0123', '+12125550123'],
    ['12125550123', '+12125550123'],
    // A number written with its country code is that country's, whatever the reading.
    ['+972501234567', '+972501234567'],
    ['00972501234567', '+972501234567'],
    ['+1 (212) 555-0123', '+12125550123'],
  ])('US: %s -> %s', (raw, expected) => {
    expect(toE164(raw, 'US')).toBe(expected);
  });

  it.each([
    ['0501234567'], // the area code cannot start with 0
    ['1125550123'], // nor with 1
    ['2120550123'], // the exchange cannot start with 0
    ['2121550123'], // nor with 1
    ['212555012'], // nine digits
    ['21255501234'], // eleven, and not a leading 1
    ['972501234567'], // an Israeli shape without its plus is not read as Israeli here
    [''],
    ['abc'],
  ])('US: %j -> null', (raw) => {
    expect(toE164(raw, 'US')).toBeNull();
  });

  it('reads a bare number as Israeli when no country is named, as always', () => {
    expect(toE164('0501234567')).toBe('+972501234567');
    expect(toE164('0501234567', 'IL')).toBe('+972501234567');
    expect(toE164('2125550123')).toBeNull();
  });
});

describe('the country of a number', () => {
  it.each([
    ['+12125550123', 'US'],
    ['+972501234567', 'IL'],
    ['0501234567', 'IL'],
    ['03-1234567', 'IL'],
    ['+447911123456', null],
    ['', null],
    [undefined, null],
    ['abc', null],
  ])('%j -> %s', (raw, expected) => {
    expect(phoneCountryOf(raw)).toBe(expected);
  });

  it("the site's country is its business phone's, Israel when unknown", () => {
    expect(siteCountry('+12125550123')).toBe('US');
    expect(siteCountry('+972501234567')).toBe('IL');
    expect(siteCountry('050-1234567')).toBe('IL');
    expect(siteCountry('+447911123456')).toBe('IL');
    expect(siteCountry('')).toBe('IL');
    expect(siteCountry(undefined)).toBe('IL');
    expect(siteCountry(null)).toBe('IL');
  });
});

describe('a +1 number on the site', () => {
  it('shows in its national form', () => {
    expect(displayPhone('+12125550123')).toBe('(212) 555-0123');
    expect(displayPhone('+1 212 555 0123')).toBe('(212) 555-0123');
    expect(displayPhone('2125550123', 'US')).toBe('(212) 555-0123');
    // Not ten digits after the +1: as it is.
    expect(displayPhone('+12125550')).toBe('+12125550');
  });

  it('dials and chats by its E.164', () => {
    expect(telHref('+12125550123')).toBe('tel:+12125550123');
    expect(telHref('(212) 555-0123', 'US')).toBe('tel:+12125550123');
    expect(isMobile('+12125550123')).toBe(true);
    expect(isMobile('(212) 555-0123', 'US')).toBe(true);
    expect(whatsAppHref('+12125550123')).toBe('https://wa.me/12125550123');
    expect(whatsAppHref('(212) 555-0123', undefined, 'US')).toBe('https://wa.me/12125550123');
  });

  it('leaves Israeli numbers as they were', () => {
    expect(displayPhone('+972501234567')).toBe('050-1234567');
    expect(displayPhone('0501234567', 'IL')).toBe('050-1234567');
    expect(isMobile('03-1234567')).toBe(false);
    expect(whatsAppHref('03-1234567')).toBeNull();
  });
});

describe('typing in a phone field', () => {
  const IL_ONLY = ['IL'] as const;
  const BOTH = ['IL', 'US'] as const;

  it.each([
    ['0501234567', '0501234567'],
    ['050-123 4567', '0501234567'],
    ['05012345678999', '0501234567'],
    // As before numbers abroad: a plus is just dropped.
    ['+972501234567', '9725012345'],
    ['+1 212 555 0123', '12125550123'.slice(0, 10)],
    ['abc', ''],
  ])('with Israel alone it is digits only, ten at most: %j -> %j', (typed, text) => {
    expect(typePhone(typed, 'IL', IL_ONLY)).toEqual({ text, country: 'IL' });
  });

  it.each([
    ['2', '2'],
    ['212', '212'],
    ['2125', '(212) 5'],
    ['212555', '(212) 555'],
    ['2125550', '(212) 555-0'],
    ['2125550123', '(212) 555-0123'],
    ['21255501239999', '(212) 555-0123'],
    ['(212) 555-012', '(212) 555-012'],
    // Deleting the last digit after a bracket or a hyphen leaves no stray mark.
    ['(212) ', '212'],
    ['(212) 555-', '(212) 555'],
    // A leading 1 is the country code.
    ['1 212 555 0123', '(212) 555-0123'],
  ])('the US chip forms the number as it is typed: %j -> %j', (typed, text) => {
    expect(typePhone(typed, 'US', BOTH)).toEqual({ text, country: 'US' });
  });

  it('the Israeli chip keeps digits only, as the forms always did', () => {
    expect(typePhone('050-123 4567', 'IL', BOTH)).toEqual({ text: '0501234567', country: 'IL' });
  });

  it.each([
    ['+12125550123', 'IL', { text: '(212) 555-0123', country: 'US' }],
    ['+1 (212) 555-0123', 'IL', { text: '(212) 555-0123', country: 'US' }],
    ['0012125550123', 'IL', { text: '(212) 555-0123', country: 'US' }],
    ['+1', 'IL', { text: '', country: 'US' }],
    ['+972501234567', 'US', { text: '0501234567', country: 'IL' }],
    ['+972 050-123-4567', 'US', { text: '0501234567', country: 'IL' }],
    ['00972501234567', 'US', { text: '0501234567', country: 'IL' }],
  ] as const)('a number with a country code moves the chip to an offered country: %j', (typed, from, entry) => {
    expect(typePhone(typed, from, BOTH)).toEqual(entry);
  });

  it('a number of a country not on offer stays as a plus and its digits, under the same chip', () => {
    expect(typePhone('+44 7911 123456', 'US', BOTH)).toEqual({ text: '+447911123456', country: 'US' });
    expect(typePhone('0044 7911 123456', 'IL', BOTH)).toEqual({ text: '+447911123456', country: 'IL' });
    expect(typePhone('+', 'IL', BOTH)).toEqual({ text: '+', country: 'IL' });
    expect(typePhone('+9', 'IL', BOTH)).toEqual({ text: '+9', country: 'IL' });
  });

  it('picking another chip types the same digits there', () => {
    expect(retypePhone('2125550123', 'US')).toBe('(212) 555-0123');
    expect(retypePhone('(212) 555-0123', 'IL')).toBe('2125550123');
  });
});

describe('a stored number in a field', () => {
  it('shows as its own country writes it, under its chip', () => {
    expect(phoneEntryOf('+12125550123')).toEqual({ country: 'US', text: '(212) 555-0123' });
    expect(phoneEntryOf('+972501234567')).toEqual({ country: 'IL', text: '0501234567' });
  });

  it('stays as it is when it is not an E.164 number of a known country', () => {
    expect(phoneEntryOf('0501234567')).toBeNull();
    expect(phoneEntryOf('+447911123456')).toBeNull();
    expect(phoneEntryOf('')).toBeNull();
    expect(phoneEntryOf(undefined)).toBeNull();
  });
});

describe('reading a phone field', () => {
  it('an Israeli number passes the three checks the forms always made, in their order', () => {
    expect(readPhone('0501234567', 'IL')).toEqual({ value: '0501234567', abroad: false });
    expect(readPhone('', 'IL')).toEqual({ problem: 'start' });
    expect(readPhone('031234567', 'IL')).toEqual({ problem: 'start' });
    expect(readPhone('050123456', 'IL')).toEqual({ problem: 'length' });
    expect(readPhone('05012345 7', 'IL')).toEqual({ problem: 'digits' });
  });

  it('an Israeli number is sent as it was typed, never in E.164', () => {
    const reading = readPhone('0521234567', 'IL', { anyPlus: true });
    expect(reading).toEqual({ value: '0521234567', abroad: false });
  });

  it('a US number is sent in E.164 and marked as a number abroad', () => {
    expect(readPhone('(212) 555-0123', 'US')).toEqual({ value: '+12125550123', abroad: true });
    expect(readPhone('2125550123', 'US')).toEqual({ value: '+12125550123', abroad: true });
  });

  it.each([['(212) 555-012'], ['(012) 555-0123'], ['(212) 155-0123'], ['']])('a US number that is not whole is refused: %j', (text) => {
    expect(readPhone(text, 'US')).toEqual({ problem: 'invalid' });
  });

  it('a number of a country not on offer is refused where a code is sent', () => {
    expect(readPhone('+447911123456', 'IL')).toEqual({ problem: 'country' });
    expect(readPhone('+447911123456', 'US')).toEqual({ problem: 'country' });
    // Not yet a number at all.
    expect(readPhone('+44', 'US')).toEqual({ problem: 'invalid' });
  });

  it('and taken where none is: any number written with a plus and a country code', () => {
    expect(readPhone('+447911123456', 'IL', { anyPlus: true })).toEqual({ value: '+447911123456', abroad: true });
    expect(readPhone('+44', 'IL', { anyPlus: true })).toEqual({ problem: 'invalid' });
  });
});

describe('an example number inside a sentence', () => {
  it('is kept whole and left to right by isolate marks, so Hebrew and Arabic do not swap its halves', () => {
    expect(phoneExampleInText('US')).toBe('⁦(212) 555-0123⁩');
    expect(phoneExampleInText('IL')).toBe('⁦0501234567⁩');
  });
});

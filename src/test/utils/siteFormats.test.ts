import { describe, it, expect } from 'vitest';
import { formatsForPhone, siteFormats, twelveHourLabel, usesAmericanFormats } from '../../utils/siteFormats';

/** LT-702: an American business's site writes the 12-hour clock and the month first; everyone else as before. */
const LANGUAGES = ['he', 'en', 'ar', 'fr', 'es'] as const;
const LRI = '⁦';
const PDI = '⁩';

describe('usesAmericanFormats', () => {
  it('is the United States only', () => {
    expect(usesAmericanFormats('US')).toBe(true);
    expect(usesAmericanFormats('IL')).toBe(false);
    expect(usesAmericanFormats(null)).toBe(false);
    expect(usesAmericanFormats(undefined)).toBe(false);
  });

  it('follows the business phone', () => {
    expect(formatsForPhone('+12125550142', 'en').american).toBe(true);
    expect(formatsForPhone('+972501234567', 'en').american).toBe(false);
    expect(formatsForPhone('', 'en').american).toBe(false);
    expect(formatsForPhone(undefined, 'en').american).toBe(false);
  });
});

describe('twelveHourLabel', () => {
  it('writes midnight, noon and the afternoon the American way', () => {
    expect(twelveHourLabel(0, 0)).toBe('12:00 AM');
    expect(twelveHourLabel(0, 30)).toBe('12:30 AM');
    expect(twelveHourLabel(9, 5)).toBe('9:05 AM');
    expect(twelveHourLabel(12, 0)).toBe('12:00 PM');
    expect(twelveHourLabel(15, 0)).toBe('3:00 PM');
    expect(twelveHourLabel(23, 45)).toBe('11:45 PM');
    expect(twelveHourLabel(24, 0)).toBe('12:00 AM');
  });
});

describe('an American site', () => {
  it('labels a wall-clock time on the 12-hour clock, isolated on right-to-left pages', () => {
    expect(siteFormats('US', 'en').clock('15:00')).toBe('3:00 PM');
    expect(siteFormats('US', 'es').clock('00:00')).toBe('12:00 AM');
    expect(siteFormats('US', 'fr').clock('12:00')).toBe('12:00 PM');
    expect(siteFormats('US', 'he').clock('15:00')).toBe(`${LRI}3:00 PM${PDI}`);
    expect(siteFormats('US', 'ar').clock('09:30')).toBe(`${LRI}9:30 AM${PDI}`);
  });

  it('labels a moment on the business clock', () => {
    // 20:00 UTC is 15:00 in New York in December.
    const ms = Date.UTC(2026, 11, 2, 20, 0);
    expect(siteFormats('US', 'en').momentClock(ms, 'America/New_York')).toBe('3:00 PM');
    expect(siteFormats('US', 'en').momentClock(Date.UTC(2026, 11, 2, 5, 0), 'America/New_York')).toBe('12:00 AM');
  });

  it('writes opening hours on the 12-hour clock in every language', () => {
    for (const language of LANGUAGES) {
      const f = siteFormats('US', language);
      const wrap = (s: string) => (language === 'he' || language === 'ar' ? `${LRI}${s}${PDI}` : s);
      expect(f.hours('09:00-17:00', true)).toBe(wrap('9:00 AM - 5:00 PM'));
      expect(f.hours('09:00-17:00', false)).toBe(wrap('9:00 AM - 5:00 PM'));
      expect(f.hours('00:00-12:00, 13:00-24:00', language === 'he')).toBe(wrap('12:00 AM - 12:00 PM, 1:00 PM - 12:00 AM'));
      expect(f.hours(null, true)).toBeNull();
    }
  });

  it('dates in en-US and es-US, other languages keep their own', () => {
    expect(siteFormats('US', 'en').dateLocale('en-GB')).toBe('en-US');
    expect(siteFormats('US', 'es').dateLocale('es-ES')).toBe('es-US');
    expect(siteFormats('US', 'he').dateLocale('he-IL')).toBe('he-IL');
    expect(siteFormats('US', 'fr').dateLocale('fr-FR')).toBe('fr-FR');
    expect(siteFormats('US', 'ar').dateLocale('ar-SA')).toBe('ar-SA');
    expect(siteFormats('US', 'en').hour12).toBe(true);
  });

  it('writes a date with the month first in English', () => {
    const day = new Date(2026, 11, 2);
    const locale = siteFormats('US', 'en').dateLocale('en-GB');
    expect(day.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' })).toBe('Wednesday, Dec 2');
    expect(day.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })).toBe('Dec 2, 2026');
  });
});

describe('any other site keeps what it showed', () => {
  it('keeps a wall-clock time as written', () => {
    for (const language of LANGUAGES) {
      const f = siteFormats('IL', language);
      expect(f.clock('15:00')).toBe('15:00');
      expect(f.clock('00:00')).toBe('00:00');
      expect(f.momentClock(Date.UTC(2026, 11, 2, 13, 0), 'Asia/Jerusalem')).toBe('15:00');
      expect(f.hour12).toBe(false);
    }
  });

  it('keeps every date locale', () => {
    for (const [language, today] of [['he', 'he-IL'], ['en', 'en-GB'], ['en', 'en-US'], ['ar', 'ar-SA'], ['fr', 'fr-FR'], ['es', 'es-ES']]) {
      expect(siteFormats('IL', language).dateLocale(today)).toBe(today);
    }
  });

  it("keeps Hebrew's raw ranges and the other languages' 12-hour form", () => {
    expect(siteFormats('IL', 'he').hours('09:00-13:00,16:00-19:00', true)).toBe('09:00-13:00, 16:00-19:00');
    for (const language of ['en', 'ar', 'fr', 'es']) {
      expect(siteFormats('IL', language).hours('09:00-13:00, 16:00-19:00', false)).toBe('9:00 AM - 1:00 PM, 4:00 PM - 7:00 PM');
      expect(siteFormats('IL', language).hours('09:00-17:00', true)).toBe('09:00-17:00');
    }
  });

  it('writes midnight as 12:00 AM, never 0:00 AM (LT-702 fix)', () => {
    expect(siteFormats('IL', 'en').hours('00:00-02:00', false)).toBe('12:00 AM - 2:00 AM');
    expect(siteFormats('IL', 'en').hours('20:00-24:00', false)).toBe('8:00 PM - 12:00 AM');
    expect(siteFormats('IL', 'en').hours('12:00-13:00', false)).toBe('12:00 PM - 1:00 PM');
  });

  it('a closed day is null, an empty day stays empty', () => {
    expect(siteFormats('IL', 'en').hours(null, false)).toBeNull();
    expect(siteFormats('IL', 'he').hours(undefined, true)).toBeNull();
    expect(siteFormats('IL', 'en').hours('', false)).toBe('');
  });
});

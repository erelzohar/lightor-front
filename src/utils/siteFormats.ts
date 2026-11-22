import { createContext, useContext } from 'react';
import { siteCountry, type PhoneCountry } from './phone';
import { zonedParts } from './businessTime';

/**
 * LT-702: how a business site writes clock times and dates for its visitors.
 *
 * A business's country is its business phone's country (`siteCountry`). An
 * American business gets the 12-hour clock ("3:00 PM", midnight "12:00 AM",
 * noon "12:00 PM") on every time a visitor reads, in every language, and the
 * month before the day in English (`en-US`) and Spanish (`es-US`); any other
 * language keeps its own way of writing the date. Everyone else sees exactly
 * what each place showed before.
 *
 * Display only: the "HH:MM" strings, ranges and timestamps stay the data they
 * are (a slot's key, what a booking sends, `workingDays`).
 */

/** The one place that says which countries write times the American way. */
export const usesAmericanFormats = (country: PhoneCountry | null | undefined): boolean => country === 'US';

/** Hebrew and Arabic pages read right to left. */
const RTL = new Set(['he', 'ar']);

/**
 * Keeps "3:00 PM" in that order on a right-to-left page: without it the
 * bidi algorithm draws "PM 3:00" (the same isolate `phoneExampleInText` uses).
 */
const isolate = (text: string): string => `⁦${text}⁩`;

const pad = (n: number): string => String(n).padStart(2, '0');

/** "15:00" -> "3:00 PM", "00:00" and "24:00" -> "12:00 AM", "12:00" -> "12:00 PM". */
export const twelveHourLabel = (hour: number, minute: number): string => {
  const h = hour % 24;
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(minute)} ${h >= 12 ? 'PM' : 'AM'}`;
};

/** "HH:MM" read as hour and minute; null for anything else. */
const parseClock = (hhmm: string): { hour: number; minute: number } | null => {
  const match = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(hhmm);
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
};

/** "09:00-17:00" -> "9:00 AM - 5:00 PM"; a part that is not a clock time stays as written. */
const twelveHourRange = (range: string): string =>
  range.split('-').map((time) => {
    const clock = parseClock(time);
    return clock ? twelveHourLabel(clock.hour, clock.minute) : time.trim();
  }).join(' - ');

/** A day's ranges ("09:00-13:00, 16:00-19:00"), trimmed and without empty parts. */
const rangesOf = (hours: string): string[] => hours.split(',').map((range) => range.trim()).filter(Boolean);

export interface SiteFormats {
  /** An American business (`usesAmericanFormats`). */
  american: boolean;
  /** Clock times on the 12-hour clock wherever a visitor reads one. */
  hour12: boolean;
  /**
   * The locale for a date. `today` is the locale that place used before
   * LT-702; an American site swaps it for `en-US` in English and `es-US` in
   * Spanish, and keeps it in every other language.
   */
  dateLocale: (today: string) => string;
  /** A wall-clock "HH:MM" (a slot, a class time): "3:00 PM" for an American site, as written otherwise. */
  clock: (hhmm: string) => string;
  /** A moment's time on the business's clock: as `clock`, for a timestamp. */
  momentClock: (ms: number, tz: string) => string;
  /**
   * One day's opening hours ("09:00-17:00", several ranges joined by ", ").
   * An American site: "9:00 AM - 5:00 PM" in every language. Otherwise
   * `rawToday` says what the place showed before: the ranges as written
   * (true), or the 12-hour form (false). Null for a closed day.
   */
  hours: (hours: string | null | undefined, rawToday: boolean) => string | null;
}

/** The formats of a site whose country is `country`, read in `language`. */
export const siteFormats = (country: PhoneCountry | null | undefined, language: string): SiteFormats => {
  const american = usesAmericanFormats(country);
  const rtl = RTL.has(language);
  const shown = (text: string): string => (american && rtl ? isolate(text) : text);
  const clock = (hhmm: string): string => {
    if (!american) return hhmm;
    const parsed = parseClock(hhmm);
    return parsed ? shown(twelveHourLabel(parsed.hour, parsed.minute)) : hhmm;
  };
  return {
    american,
    hour12: american,
    dateLocale: (today) => (american && language === 'en' ? 'en-US' : american && language === 'es' ? 'es-US' : today),
    clock,
    momentClock: (ms, tz) => {
      const { hour, minute } = zonedParts(ms, tz);
      return clock(`${pad(hour)}:${pad(minute)}`);
    },
    hours: (hours, rawToday) => {
      if (hours === null || hours === undefined) return null;
      const ranges = rangesOf(hours);
      if (!ranges.length) return '';
      if (!american && rawToday) return ranges.join(', ');
      return shown(ranges.map(twelveHourRange).join(', '));
    },
  };
};

/** The formats of the site whose business phone is `businessPhone`. */
export const formatsForPhone = (businessPhone: string | null | undefined, language: string): SiteFormats =>
  siteFormats(siteCountry(businessPhone), language);

/**
 * The site's country for parts drawn far from its config (the blog's dates).
 * Israel when no site sets it, as `siteCountry` does.
 */
export const SiteCountryContext = createContext<PhoneCountry>('IL');
export const useSiteCountry = (): PhoneCountry => useContext(SiteCountryContext);

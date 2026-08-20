import { describe, it, expect } from 'vitest';
import {
  parseIntervals,
  getHoursForDate,
  toLocalDateKey,
} from '../../utils/workingHours';

describe('parseIntervals', () => {
  it('parses a single range (all pre-LT-057 data)', () => {
    expect(parseIntervals('09:00-17:00')).toEqual([
      { startMin: 9 * 60, endMin: 17 * 60 },
    ]);
  });

  it('parses multiple comma-separated ranges (the gap is the break)', () => {
    expect(parseIntervals('09:00-13:00,14:00-18:00')).toEqual([
      { startMin: 9 * 60, endMin: 13 * 60 },
      { startMin: 14 * 60, endMin: 18 * 60 },
    ]);
  });

  it('trims whitespace around commas and inside ranges', () => {
    expect(parseIntervals(' 09:00-13:00 , 14:30 - 18:00 ')).toEqual([
      { startMin: 9 * 60, endMin: 13 * 60 },
      { startMin: 14 * 60 + 30, endMin: 18 * 60 },
    ]);
  });

  it('sorts unsorted input after parsing', () => {
    expect(parseIntervals('14:00-18:00,09:00-13:00')).toEqual([
      { startMin: 9 * 60, endMin: 13 * 60 },
      { startMin: 14 * 60, endMin: 18 * 60 },
    ]);
  });

  it('returns [] for null, undefined and empty input', () => {
    expect(parseIntervals(null)).toEqual([]);
    expect(parseIntervals(undefined)).toEqual([]);
    expect(parseIntervals('')).toEqual([]);
    expect(parseIntervals('   ')).toEqual([]);
  });

  it('ignores malformed ranges rather than throwing', () => {
    expect(parseIntervals('garbage')).toEqual([]);
    expect(parseIntervals('9-17')).toEqual([]);
    expect(parseIntervals('25:00-26:00')).toEqual([]);
    expect(parseIntervals('10:75-11:00')).toEqual([]);
    // A valid range survives next to a malformed one.
    expect(parseIntervals('garbage,09:00-12:00')).toEqual([
      { startMin: 9 * 60, endMin: 12 * 60 },
    ]);
    // Stray commas are skipped.
    expect(parseIntervals(',09:00-12:00,')).toEqual([
      { startMin: 9 * 60, endMin: 12 * 60 },
    ]);
  });

  it('ignores empty and inverted ranges', () => {
    expect(parseIntervals('12:00-12:00')).toEqual([]);
    expect(parseIntervals('17:00-09:00')).toEqual([]);
  });
});

describe('toLocalDateKey', () => {
  it('formats the browser-local calendar date, zero-padded', () => {
    // Local constructor: 5 Mar, month index 2. toISOString could shift this
    // across UTC midnight; the key must not.
    expect(toLocalDateKey(new Date(2026, 2, 5))).toBe('2026-03-05');
    expect(toLocalDateKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});

describe('getHoursForDate', () => {
  // Sun..Sat; Saturday (index 6) is normally closed.
  const workingDays: (string | null)[] = [
    '09:00-17:00', // Sun
    '09:00-13:00,14:00-18:00', // Mon
    '09:00-17:00', // Tue
    '09:00-17:00', // Wed
    '09:00-17:00', // Thu
    '09:00-14:00', // Fri
    null, // Sat
  ];

  // 2026-08-17 is a Monday, 2026-08-22 a Saturday (local dates).
  const monday = new Date(2026, 7, 17);
  const saturday = new Date(2026, 7, 22);

  it('falls back to the weekly hours when overrides are undefined', () => {
    expect(getHoursForDate(monday, workingDays)).toBe('09:00-13:00,14:00-18:00');
    expect(getHoursForDate(saturday, workingDays)).toBeNull();
  });

  it('falls back to the weekly hours when no override matches the date', () => {
    const overrides = [{ date: '2026-08-18', hours: null }];
    expect(getHoursForDate(monday, workingDays, overrides)).toBe('09:00-13:00,14:00-18:00');
  });

  it('lets an override replace the weekly hours for its date', () => {
    const overrides = [{ date: '2026-08-17', hours: '11:00-15:00' }];
    expect(getHoursForDate(monday, workingDays, overrides)).toBe('11:00-15:00');
  });

  it('lets an override with hours null close a normally-open date', () => {
    const overrides = [{ date: '2026-08-17', hours: null }];
    expect(getHoursForDate(monday, workingDays, overrides)).toBeNull();
  });

  it('lets an override open a normally-closed weekday', () => {
    const overrides = [{ date: '2026-08-22', hours: '10:00-14:00' }];
    expect(getHoursForDate(saturday, workingDays, overrides)).toBe('10:00-14:00');
    // ...and the opened hours parse into usable intervals.
    expect(parseIntervals(getHoursForDate(saturday, workingDays, overrides)))
      .toEqual([{ startMin: 10 * 60, endMin: 14 * 60 }]);
  });

  it('treats an empty overrides array like no overrides', () => {
    expect(getHoursForDate(monday, workingDays, [])).toBe('09:00-13:00,14:00-18:00');
    expect(getHoursForDate(saturday, workingDays, [])).toBeNull();
  });

  it('matches against the local calendar date, not the UTC one', () => {
    // 5 minutes before local midnight: in any timezone west of UTC the
    // toISOString() date would already be "tomorrow" (or "yesterday" east).
    const lateEvening = new Date(2026, 7, 17, 23, 55);
    const overrides = [{ date: '2026-08-17', hours: '20:00-23:00' }];
    expect(getHoursForDate(lateEvening, workingDays, overrides)).toBe('20:00-23:00');
  });
});

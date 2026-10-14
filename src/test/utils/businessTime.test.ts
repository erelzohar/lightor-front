import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TIME_ZONE,
  isValidTimeZone,
  resolveTimeZone,
  zonedDateOf,
  zonedParts,
  zonedSlotMs,
  zonedTimeLabel,
  zonedTimeToMs,
} from '../../utils/businessTime';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

/** The wall clock `tz` shows at `ms`, read independently with Intl. */
const wallClock = (ms: number, tz: string) =>
  new Date(ms).toLocaleString('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

/** LT-318 — business wall-clock time, whatever zone this machine is in. */
describe('business time helpers', () => {
  it('turns a wall-clock time into the moment the business sees it', () => {
    // EZ-lines' case: 11:00 on 14.10.2026 in Israel.
    expect(zonedTimeToMs(2026, 9, 14, 11, 0, 'Asia/Jerusalem')).toBe(1791964800000);
    expect(zonedTimeToMs(2026, 9, 14, 11, 0, 'America/New_York')).toBe(Date.UTC(2026, 9, 14, 15, 0));
    expect(zonedTimeToMs(2026, 9, 14, 11, 0, 'Asia/Kathmandu')).toBe(Date.UTC(2026, 9, 14, 5, 15));
  });

  it.each([
    ['Asia/Jerusalem', 2026, 9, 25],      // autumn change, 25.10.2026
    ['Asia/Jerusalem', 2027, 2, 26],      // spring change, 26.3.2027
    ['America/New_York', 2026, 10, 1],
    ['America/New_York', 2027, 2, 14],
    ['Australia/Adelaide', 2026, 9, 4],   // a half-hour zone's change
    ['Australia/Adelaide', 2027, 3, 4],
    ['Pacific/Auckland', 2026, 8, 27],
  ])('keeps every working hour exact across %s on %i-%i-%i', (tz, year, month, day) => {
    for (let hour = 4; hour <= 22; hour++) {
      for (const minute of [0, 20, 40]) {
        const ms = zonedTimeToMs(year, month, day, hour, minute, tz);
        const expected = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}, ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        expect(wallClock(ms, tz)).toBe(expected);
      }
    }
  });

  it('reads a moment back as the business sees it', () => {
    const ms = Date.UTC(2026, 9, 14, 21, 30); // 00:30 the next day in Israel
    expect(zonedParts(ms, 'Asia/Jerusalem')).toEqual({ year: 2026, month: 9, day: 15, hour: 0, minute: 30 });
    expect(zonedTimeLabel(ms, 'Asia/Jerusalem')).toBe('00:30');

    const day = zonedDateOf(ms, 'Asia/Jerusalem');
    expect([day.getFullYear(), day.getMonth(), day.getDate(), day.getHours()]).toEqual([2026, 9, 15, 0]);
  });

  it('builds a slot on a calendar day', () => {
    expect(zonedSlotMs(new Date(2026, 9, 14), 11, 0, 'Asia/Jerusalem')).toBe(1791964800000);
  });

  it('falls back to Israel for a missing or unknown zone', () => {
    expect(isValidTimeZone('America/New_York')).toBe(true);
    expect(isValidTimeZone('Mars/Phobos')).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
    expect(resolveTimeZone('Mars/Phobos')).toBe(DEFAULT_TIME_ZONE);
    expect(resolveTimeZone(undefined)).toBe('Asia/Jerusalem');
  });

  it('carries the zone through the site config', () => {
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, timeZone: 'Europe/London' }).timeZone).toBe('Europe/London');
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE }).timeZone).toBe('Asia/Jerusalem');
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, timeZone: 'nope' }).timeZone).toBe('Asia/Jerusalem');
  });
});

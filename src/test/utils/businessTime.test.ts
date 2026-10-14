import { describe, it, expect, vi, afterAll } from 'vitest';
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

/**
 * LT-315 (review M1), on LT-318's helpers: an Israeli business read from a
 * device in another zone. Node picks up a changed TZ at once (vi.stubEnv), so
 * each zone below is the device's for real — and the calendar-day carriers
 * (`new Date(y, m, d)`) are built in it.
 */
describe.each(['Asia/Jerusalem', 'Europe/London', 'America/New_York', 'Asia/Tokyo', 'Pacific/Kiritimati'])(
  'an Israeli business on a device in %s',
  (zone) => {
    const IL = 'Asia/Jerusalem';
    // 2026-10-14 16:00 in Israel is 13:00 UTC (summer time, UTC+3).
    const OCT_14_1600_IL = Date.UTC(2026, 9, 14, 13, 0);
    // 2026-10-26 16:00 in Israel is 14:00 UTC (winter time from 2026-10-25, UTC+2).
    const OCT_26_1600_IL = Date.UTC(2026, 9, 26, 14, 0);

    const inZone = <T>(fn: () => T): T => {
      vi.stubEnv('TZ', zone);
      return fn();
    };
    afterAll(() => {
      vi.unstubAllEnvs();
    });

    it('turns 16:00 on a picked day into the Israeli instant, and back', () => {
      inZone(() => {
        expect(zonedSlotMs(new Date(2026, 9, 14), 16, 0, IL)).toBe(OCT_14_1600_IL);
        expect(zonedTimeLabel(OCT_14_1600_IL, IL)).toBe('16:00');
        const day = zonedDateOf(OCT_14_1600_IL, IL);
        expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([2026, 9, 14]);
      });
    });

    it('moves the offset with Israel’s clock change on 2026-10-25, not the device’s', () => {
      inZone(() => {
        expect(zonedSlotMs(new Date(2026, 9, 26), 16, 0, IL)).toBe(OCT_26_1600_IL);
        expect(zonedTimeLabel(OCT_26_1600_IL, IL)).toBe('16:00');
        // The change day itself: 09:00 is already winter time (UTC+2).
        expect(zonedSlotMs(new Date(2026, 9, 25), 9, 0, IL)).toBe(Date.UTC(2026, 9, 25, 7, 0));
        // Two calendar days apart across the change: the clocks went back an
        // hour, so 49 hours, not 48.
        expect(zonedSlotMs(new Date(2026, 9, 26), 9, 0, IL) - zonedSlotMs(new Date(2026, 9, 24), 9, 0, IL))
          .toBe(49 * 3_600_000);
      });
    });

    it('reads the clock right on both sides of each change, to the minute', () => {
      inZone(() => {
        // Autumn: 02:00 summer time (23:00 UTC) goes back to 01:00.
        expect(zonedTimeLabel(Date.UTC(2026, 9, 24, 22, 59), IL)).toBe('01:59');
        expect(zonedTimeLabel(Date.UTC(2026, 9, 24, 23, 0), IL)).toBe('01:00');
        // Spring 2027: 02:00 winter time (00:00 UTC on Friday the 26th) jumps to 03:00.
        expect(zonedTimeLabel(Date.UTC(2027, 2, 25, 23, 59), IL)).toBe('01:59');
        expect(zonedTimeLabel(Date.UTC(2027, 2, 26, 0, 0), IL)).toBe('03:00');
        expect(zonedSlotMs(new Date(2027, 2, 26), 9, 0, IL)).toBe(Date.UTC(2027, 2, 26, 6, 0));
      });
    });

    it('knows the Israeli date near midnight, when the device’s date differs', () => {
      inZone(() => {
        // 23:30 UTC on the 13th is 02:30 on the 14th in Israel.
        const lateUtc = Date.UTC(2026, 9, 13, 23, 30);
        expect(zonedParts(lateUtc, IL)).toEqual({ year: 2026, month: 9, day: 14, hour: 2, minute: 30 });
        const today = zonedDateOf(lateUtc, IL);
        expect(today.getDate()).toBe(14);
        expect(today.getHours()).toBe(0);
      });
    });

    it('ends a business day at Israeli midnight, rolling into the next month', () => {
      inZone(() => {
        // Midnight between the 14th and 15th in Israel is 21:00 UTC on the 14th.
        expect(zonedTimeToMs(2026, 9, 15, 0, 0, IL)).toBe(Date.UTC(2026, 9, 14, 21, 0));
        // Day 32 of October is 1 November, as the booking window's end asks.
        expect(zonedTimeToMs(2026, 9, 32, 0, 0, IL)).toBe(Date.UTC(2026, 9, 31, 22, 0));
      });
    });
  }
);

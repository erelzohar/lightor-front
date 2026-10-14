import { describe, it, expect, vi, afterAll } from 'vitest';
import {
  businessClockOf,
  businessDayEnd,
  businessDayOf,
  businessEpoch,
  businessTimeOf,
  businessToday,
  calendarDay,
  slotStart,
} from '../../utils/businessTime';

/**
 * Review M1 (LT-315): the booking widget reads the business's clock, Israel's,
 * whatever zone the visitor's device is set to. Node picks up a changed TZ
 * at once (vi.stubEnv sets it), so each zone below is the device's for real.
 */

afterAll(() => {
  vi.unstubAllEnvs();
});

// 2026-10-14 16:00 in Israel is 13:00 UTC (summer time, UTC+3).
const OCT_14_1600_IL = Date.UTC(2026, 9, 14, 13, 0);
// 2026-10-26 16:00 in Israel is 14:00 UTC (winter time from 2026-10-25, UTC+2).
const OCT_26_1600_IL = Date.UTC(2026, 9, 26, 14, 0);

describe.each(['Asia/Jerusalem', 'Europe/London', 'America/New_York', 'Asia/Tokyo', 'Pacific/Kiritimati'])(
  'the business clock on a device in %s',
  (zone) => {
    const inZone = <T>(fn: () => T): T => {
      vi.stubEnv('TZ', zone);
      return fn();
    };

    it('turns 16:00 on a picked day into the Israeli instant', () => {
      inZone(() => {
        expect(slotStart(calendarDay(2026, 9, 14), '16:00')).toBe(OCT_14_1600_IL);
        expect(businessEpoch(2026, 9, 14, 16, 0)).toBe(OCT_14_1600_IL);
      });
    });

    it('shows that instant as 16:00 on the 14th', () => {
      inZone(() => {
        expect(businessTimeOf(OCT_14_1600_IL)).toBe('16:00');
        const day = businessDayOf(OCT_14_1600_IL);
        expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([2026, 9, 14]);
      });
    });

    it('moves the offset with Israel’s clock change on 2026-10-25, not the device’s', () => {
      inZone(() => {
        expect(slotStart(calendarDay(2026, 9, 26), '16:00')).toBe(OCT_26_1600_IL);
        expect(businessTimeOf(OCT_26_1600_IL)).toBe('16:00');
        // The change day itself: 09:00 is already winter time (UTC+2).
        expect(slotStart(calendarDay(2026, 9, 25), '09:00')).toBe(Date.UTC(2026, 9, 25, 7, 0));
        // Two calendar days apart across the change: the clocks went back an
        // hour, so 49 hours, not 48.
        expect(slotStart(calendarDay(2026, 9, 26), '09:00') - slotStart(calendarDay(2026, 9, 24), '09:00'))
          .toBe(49 * 3_600_000);
      });
    });

    it('reads the clock right on both sides of each change, to the minute', () => {
      inZone(() => {
        // Autumn: 02:00 summer time (23:00 UTC) goes back to 01:00.
        expect(businessTimeOf(Date.UTC(2026, 9, 24, 22, 59))).toBe('01:59');
        expect(businessTimeOf(Date.UTC(2026, 9, 24, 23, 0))).toBe('01:00');
        // Spring 2027: 02:00 winter time (00:00 UTC on Friday the 26th) jumps to 03:00.
        expect(businessTimeOf(Date.UTC(2027, 2, 25, 23, 59))).toBe('01:59');
        expect(businessTimeOf(Date.UTC(2027, 2, 26, 0, 0))).toBe('03:00');
        expect(slotStart(calendarDay(2027, 2, 26), '09:00')).toBe(Date.UTC(2027, 2, 26, 6, 0));
      });
    });

    it('knows the Israeli date near midnight, when the device’s date differs', () => {
      inZone(() => {
        // 23:30 UTC on the 13th is 02:30 on the 14th in Israel.
        const lateUtc = Date.UTC(2026, 9, 13, 23, 30);
        expect(businessClockOf(lateUtc)).toMatchObject({ year: 2026, month: 9, day: 14, hour: 2, minute: 30 });
        const today = businessToday(lateUtc);
        expect(today.getDate()).toBe(14);
        expect(today.getHours()).toBe(0);
      });
    });

    it('ends a business day at Israeli midnight', () => {
      inZone(() => {
        // Midnight between the 14th and 15th in Israel is 21:00 UTC on the 14th.
        expect(businessDayEnd(calendarDay(2026, 9, 14))).toBe(Date.UTC(2026, 9, 14, 21, 0) - 1);
        // A month's last day rolls into the next month.
        expect(businessDayEnd(calendarDay(2026, 9, 31))).toBe(Date.UTC(2026, 9, 31, 22, 0) - 1);
      });
    });
  }
);

/**
 * The business's clock (LT-315, review M1).
 *
 * Every Lightor business is in Israel: the server, the SMS texts and the
 * dashboard read times in Asia/Jerusalem. The booking widget did its
 * wall-clock maths in the device's zone, so a visitor whose phone is set to
 * London saw 09:00-17:00 slots for a business open 09:00-17:00 Israel time,
 * and picking 16:00 booked 18:00 Israel time.
 *
 * Two kinds of value meet here:
 *  - an instant (epoch ms): a booking, a class session, "now". It becomes a
 *    date and a clock time only through Asia/Jerusalem.
 *  - a calendar day the visitor picks: a device-local midnight Date,
 *    `new Date(y, m, d)`, used only as a carrier for year, month and day.
 *    Its own instant means nothing; the month grid, getDay() and the
 *    YYYY-MM-DD override keys read its fields, which mean the same day on
 *    every device. It turns into an instant only through `slotStart`.
 *
 * No library: Intl knows the zone's rules, and the offset is read at the
 * instant in question, so both sides of a clock change (2026-10-25 in
 * Israel) come out right. Days are counted as calendar dates, never as
 * 24-hour steps.
 *
 * The calendar asks for thousands of slot instants per render (every day,
 * every slot, several checks each), so Intl is asked once per UTC hour and
 * the answer kept: Israel's clock only ever changes on the hour in UTC.
 */

export const BUSINESS_TIME_ZONE = 'Asia/Jerusalem';

export interface BusinessClock {
  year: number;
  /** 0-11, as Date's. */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

let partsFormat: Intl.DateTimeFormat | null = null;
const format = (): Intl.DateTimeFormat =>
  (partsFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }));

const HOUR_MS = 3_600_000;
const offsets = new Map<number, number>();

/** The zone's distance from UTC at that instant, in ms: +3 h in an Israeli summer, +2 h in winter. */
const offsetAt = (ms: number): number => {
  const hour = Math.floor(ms / HOUR_MS);
  const known = offsets.get(hour);
  if (known !== undefined) return known;

  const parts = format().formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  // Some engines print midnight as "24" even with h23.
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  const offset = Math.round((asUtc - ms) / 60_000) * 60_000;

  if (offsets.size > 20_000) offsets.clear();
  offsets.set(hour, offset);
  return offset;
};

/** What the business's clock and calendar read at that instant. */
export const businessClockOf = (ms: number): BusinessClock => {
  const local = new Date(ms + offsetAt(ms));
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth(),
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
    second: local.getUTCSeconds(),
  };
};

/**
 * The instant the business's clock reads that date and time. Out-of-range
 * fields roll over as Date.UTC's do (day 32 is the 1st of the next month).
 * The offset is read twice, so a time just after a clock change uses the
 * offset in force then; a time the change skips lands an hour later, and one
 * it repeats takes its second occurrence.
 */
export const businessEpoch = (year: number, month: number, day: number, hour = 0, minute = 0): number => {
  const asUtc = Date.UTC(year, month, day, hour, minute);
  const guess = asUtc - offsetAt(asUtc);
  return asUtc - offsetAt(guess);
};

/** A calendar-day carrier: device-local midnight of that date. */
export const calendarDay = (year: number, month: number, day: number): Date => new Date(year, month, day);

/** The business's calendar day at that instant, as a carrier. */
export const businessDayOf = (ms: number): Date => {
  const c = businessClockOf(ms);
  return calendarDay(c.year, c.month, c.day);
};

/** Today on the business's calendar, as a carrier. */
export const businessToday = (now: number = Date.now()): Date => businessDayOf(now);

/** Same calendar date — both carriers, or a carrier and businessDayOf(instant). */
export const sameCalendarDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "HH:MM" on the business's clock at that instant. */
export const businessTimeOf = (ms: number): string => {
  const c = businessClockOf(ms);
  return `${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
};

/** The instant a slot starts: the carrier's date at "HH:MM" on the business's clock. */
export const slotStart = (day: Date, time: string): number => {
  const [hour, minute] = time.split(':').map(Number);
  return businessEpoch(day.getFullYear(), day.getMonth(), day.getDate(), hour || 0, minute || 0);
};

/** The last millisecond of the carrier's date on the business's clock. */
export const businessDayEnd = (day: Date): number =>
  businessEpoch(day.getFullYear(), day.getMonth(), day.getDate() + 1) - 1;

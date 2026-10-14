/**
 * Wall-clock time in the BUSINESS's time zone (LT-318), whatever zone the
 * visitor's device is set to.
 *
 * Before this, every slot was built with the device clock (`setHours`): a
 * phone set one zone ahead of the business was shown "11:00", sent "11:00" in
 * the confirmation, and saved 10:00 — EZ-lines, the predecessor, stored two
 * real bookings that way.
 *
 * Calendar days stay "carrier" Dates at local midnight (`new Date(y, m, d)`):
 * only their year, month, date and weekday are read, and those describe a
 * calendar day in any zone. Every real moment — a slot, an appointment, a
 * class session, "now" — goes through the helpers below.
 */

export const DEFAULT_TIME_ZONE = 'Asia/Jerusalem';

export const isValidTimeZone = (tz: unknown): tz is string => {
  if (typeof tz !== 'string' || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/** The business's zone, or Israel for configs that predate the field. */
export const resolveTimeZone = (tz: unknown): string => (isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE);

const formatters = new Map<string, Intl.DateTimeFormat>();
const formatterFor = (tz: string) => {
  let formatter = formatters.get(tz);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
    formatters.set(tz, formatter);
  }
  return formatter;
};

export interface ZonedParts {
  year: number;
  /** 0-based, like Date#getMonth. */
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** The wall clock of a moment in `tz`. */
export const zonedParts = (ms: number, tz: string): ZonedParts => {
  const parts: Record<string, number> = {};
  for (const part of formatterFor(tz).formatToParts(new Date(ms))) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return { year: parts.year, month: parts.month - 1, day: parts.day, hour: parts.hour, minute: parts.minute };
};

// Offsets change only on a quarter hour of UTC (zones are whole, half or
// quarter hours off UTC and switch on a local whole hour), so one Intl call per
// zone and quarter hour is exact. The calendar asks for thousands of slots per
// render; uncached, the Intl work made each render many times slower.
const offsets = new Map<string, Map<number, number>>();
const QUARTER_MS = 900_000;

const zoneOffsetMs = (ms: number, tz: string): number => {
  let byQuarter = offsets.get(tz);
  if (!byQuarter) {
    byQuarter = new Map();
    offsets.set(tz, byQuarter);
  }
  const quarter = Math.floor(ms / QUARTER_MS);
  let offset = byQuarter.get(quarter);
  if (offset === undefined) {
    const at = quarter * QUARTER_MS;
    const p = zonedParts(at, tz);
    offset = Date.UTC(p.year, p.month, p.day, p.hour, p.minute) - at;
    byQuarter.set(quarter, offset);
  }
  return offset;
};

/** The moment `tz`'s wall clock shows this date and time. */
export const zonedTimeToMs = (year: number, month: number, day: number, hour: number, minute: number, tz: string): number => {
  const wallClockAsUtc = Date.UTC(year, month, day, hour, minute);
  const guess = wallClockAsUtc - zoneOffsetMs(wallClockAsUtc, tz);
  // A second pass settles a guess that crossed a daylight-saving change.
  return wallClockAsUtc - zoneOffsetMs(guess, tz);
};

/** The moment a calendar day (carrier) reaches hour:minute in `tz`. */
export const zonedSlotMs = (day: Date, hour: number, minute: number, tz: string): number =>
  zonedTimeToMs(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, tz);

/** The calendar day a moment falls on in `tz`, as a carrier. */
export const zonedDateOf = (ms: number, tz: string): Date => {
  const p = zonedParts(ms, tz);
  return new Date(p.year, p.month, p.day);
};

/** Today in `tz`, as a carrier. */
export const zonedToday = (tz: string): Date => zonedDateOf(Date.now(), tz);

/** "HH:MM" of a moment on `tz`'s clock. */
export const zonedTimeLabel = (ms: number, tz: string): string => {
  const { hour, minute } = zonedParts(ms, tz);
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

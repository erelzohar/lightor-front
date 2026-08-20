/**
 * Working-hours parsing and per-date resolution (LT-057).
 *
 * A day's hours value is either `null` (closed) or one or more comma-separated
 * ranges, each `HH:MM-HH:MM` in zero-padded 24h time, e.g.
 * `"09:00-13:00,14:00-18:00"` — the gap between ranges is the break.
 * Single-range strings (all pre-LT-057 data) are a valid special case.
 */

export interface WorkingInterval {
  /** Minutes since local midnight, inclusive start. */
  startMin: number;
  /** Minutes since local midnight, exclusive end. */
  endMin: number;
}

/** A per-date override: `hours` fully replaces the weekly value for `date`. */
export interface DateOverride {
  /** Calendar date, `YYYY-MM-DD` (local). */
  date: string;
  /** Multi-interval hours string, or null = closed on that date. */
  hours: string | null;
}

const RANGE_RE = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;

/**
 * Parse a multi-interval hours string into sorted minute intervals.
 *
 * Tolerant by design: whitespace around commas is trimmed, unsorted input is
 * sorted after parsing, and malformed or inverted ranges are ignored rather
 * than thrown on. `null`/`undefined`/unparsable input yields `[]`.
 */
export function parseIntervals(
  hours: string | null | undefined
): WorkingInterval[] {
  if (!hours || typeof hours !== 'string') return [];

  const intervals: WorkingInterval[] = [];
  for (const part of hours.split(',')) {
    const range = part.trim();
    if (!range) continue;

    const match = RANGE_RE.exec(range);
    if (!match) continue;

    const startMin = +match[1] * 60 + +match[2];
    const endMin = +match[3] * 60 + +match[4];

    // Reject impossible clock values ("25:00", "10:75") and empty or
    // inverted ranges. 24:00 is tolerated as an end-of-day endpoint.
    if (+match[2] > 59 || +match[4] > 59) continue;
    if (startMin >= 24 * 60 || endMin > 24 * 60) continue;
    if (endMin <= startMin) continue;

    intervals.push({ startMin, endMin });
  }

  return intervals.sort((a, b) => a.startMin - b.startMin);
}

/**
 * Format a Date as its browser-local `YYYY-MM-DD` calendar date.
 * Deliberately NOT toISOString(), which shifts across UTC midnight.
 */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Resolve the effective hours string for a calendar date.
 *
 * Resolution order: a dateOverrides entry matching the local calendar date
 * fully replaces `workingDays[date.getDay()]` — including `hours: null`
 * (closed for that date) and including opening a weekday that is normally
 * closed. With no matching override, the weekly value applies.
 */
export function getHoursForDate(
  date: Date,
  workingDays: (string | null)[],
  dateOverrides?: Array<{ date: string; hours: string | null }>
): string | null {
  const key = toLocalDateKey(date);
  const override = dateOverrides?.find((o) => o && o.date === key);
  if (override !== undefined) return override.hours ?? null;
  return workingDays?.[date.getDay()] ?? null;
}

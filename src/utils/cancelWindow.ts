/**
 * The owner's cancellation window, as the public site meets it (LT-205).
 *
 * A customer may cancel or move a booking online only while it is at least
 * `minCancelTimeMS` away, and a move must also land at least that far ahead.
 * The server is the copy that counts (lightor-back src/utils/cancelWindow.ts,
 * LT-184): it refuses with 400 `CANCEL_WINDOW_CLOSED` and names the window it
 * applied in `details.minCancelTimeMS`.
 *
 * Kept out of AppointmentService on purpose: the component tests replace that
 * module whole, and the pages must still recognise this error under them.
 */

export const CANCEL_WINDOW_CLOSED = 'CANCEL_WINDOW_CLOSED';

/** The server's window for a business that never chose one (LT-184). */
export const DEFAULT_MIN_CANCEL_TIME_MS = 3_600_000;

/**
 * A cancel or move the server refused as too late. `minCancelTimeMS` is the
 * window it applied, or undefined when it did not say — the page then falls
 * back to the window it already knows.
 */
export class CancelWindowClosedError extends Error {
  readonly code = CANCEL_WINDOW_CLOSED;
  readonly minCancelTimeMS?: number;

  constructor(minCancelTimeMS?: unknown) {
    super(CANCEL_WINDOW_CLOSED);
    this.name = 'CancelWindowClosedError';
    if (typeof minCancelTimeMS === 'number' && Number.isFinite(minCancelTimeMS) && minCancelTimeMS > 0) {
      this.minCancelTimeMS = minCancelTimeMS;
    }
  }
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * The window in words, in the page's language: "1 hour", "שעתיים",
 * "30 minutes", "3 jours". Days when it is a whole number of them, hours
 * likewise, minutes otherwise — the dashboard offers 30 minutes to a week.
 * Intl knows each language's plurals, Hebrew's and Arabic's dual included,
 * which a "{{hours}} hours" string cannot.
 */
export const formatCancelWindow = (ms: number, language: string): string => {
  const [unit, amount]: ['day' | 'hour' | 'minute', number] =
    ms >= DAY_MS && ms % DAY_MS === 0 ? ['day', ms / DAY_MS]
      : ms >= HOUR_MS && ms % HOUR_MS === 0 ? ['hour', ms / HOUR_MS]
        : ['minute', Math.max(1, Math.round(ms / MINUTE_MS))];
  try {
    return new Intl.NumberFormat(language, { style: 'unit', unit, unitDisplay: 'long' }).format(amount);
  } catch {
    // A browser without unit formatting (Safari before 14.1) still gets a
    // line, rather than a page that throws while rendering it.
    return `${amount} ${unit}${amount === 1 ? '' : 's'}`;
  }
};

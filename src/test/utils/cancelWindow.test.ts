import { describe, it, expect } from 'vitest';
import { CancelWindowClosedError, formatCancelWindow } from '../../utils/cancelWindow';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * LT-205 — the line a refused cancel shows names the owner's window in the
 * customer's language, with that language's plural. "1 hours" and "0.5
 * hours" are what a "{{hours}} hours" string makes of the same numbers.
 */
describe('the cancellation window in words', () => {
  it('uses days, then hours, then minutes — whichever is whole', () => {
    expect(formatCancelWindow(30 * MINUTE, 'en')).toBe('30 minutes');
    expect(formatCancelWindow(HOUR, 'en')).toBe('1 hour');
    expect(formatCancelWindow(2 * HOUR, 'en')).toBe('2 hours');
    expect(formatCancelWindow(90 * MINUTE, 'en')).toBe('90 minutes');
    expect(formatCancelWindow(DAY, 'en')).toBe('1 day');
    expect(formatCancelWindow(36 * HOUR, 'en')).toBe('36 hours');
    expect(formatCancelWindow(7 * DAY, 'en')).toBe('7 days');
  });

  it('speaks Hebrew, dual forms included', () => {
    expect(formatCancelWindow(30 * MINUTE, 'he')).toBe('30 דקות');
    expect(formatCancelWindow(HOUR, 'he')).toBe('1 שעה');
    expect(formatCancelWindow(2 * HOUR, 'he')).toBe('שעתיים');
    expect(formatCancelWindow(3 * HOUR, 'he')).toBe('3 שעות');
    expect(formatCancelWindow(2 * DAY, 'he')).toBe('יומיים');
  });

  it('speaks Arabic, dual forms included', () => {
    // Digit shapes follow the browser's Arabic numbering; the words do not.
    expect(formatCancelWindow(HOUR, 'ar')).toBe('ساعة');
    expect(formatCancelWindow(2 * HOUR, 'ar')).toBe('ساعتان');
    expect(formatCancelWindow(2 * DAY, 'ar')).toBe('يومان');
    expect(formatCancelWindow(3 * HOUR, 'ar')).toMatch(/ساعات$/);
    expect(formatCancelWindow(30 * MINUTE, 'ar')).toMatch(/دقيقة$/);
  });

  it('speaks French and Spanish', () => {
    // French ties the number to its unit with a no-break space.
    expect(formatCancelWindow(HOUR, 'fr')).toBe('1 heure');
    expect(formatCancelWindow(3 * DAY, 'fr')).toBe('3 jours');
    expect(formatCancelWindow(30 * MINUTE, 'fr')).toMatch(/^30\s+minutes$/);
    expect(formatCancelWindow(HOUR, 'es')).toBe('1 hora');
    expect(formatCancelWindow(2 * DAY, 'es')).toBe('2 días');
    expect(formatCancelWindow(30 * MINUTE, 'es')).toBe('30 minutos');
  });

  it('never says zero minutes', () => {
    expect(formatCancelWindow(20_000, 'en')).toBe('1 minute');
  });
});

describe('the refusal (LT-205)', () => {
  it("keeps the server's window when it is a real one, and nothing otherwise", () => {
    expect(new CancelWindowClosedError(HOUR).minCancelTimeMS).toBe(HOUR);
    expect(new CancelWindowClosedError(undefined).minCancelTimeMS).toBeUndefined();
    expect(new CancelWindowClosedError('3600000').minCancelTimeMS).toBeUndefined();
    expect(new CancelWindowClosedError(0).minCancelTimeMS).toBeUndefined();
    expect(new CancelWindowClosedError(HOUR)).toMatchObject({ code: 'CANCEL_WINDOW_CLOSED', name: 'CancelWindowClosedError' });
  });
});

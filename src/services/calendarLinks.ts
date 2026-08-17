/**
 * "Add to calendar" for the customer's own booking (LT-044).
 *
 * Both paths are built entirely client-side from data the booking flow already
 * holds — no API call, no auth surface. Google gets its template URL (opens
 * pre-filled in the user's own Google Calendar); everyone else gets a
 * downloaded .ics, which Apple Calendar and Outlook open natively.
 */

export interface CalendarEventInput {
  title: string;
  /** Epoch ms. */
  start: number;
  /** Epoch ms. */
  end: number;
  location?: string;
}

/** Epoch ms → the compact UTC form both Google and ICS want: YYYYMMDDTHHMMSSZ. */
const compactUtc = (ms: number): string =>
  new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export const googleCalendarUrl = (event: CalendarEventInput): string => {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${compactUtc(event.start)}/${compactUtc(event.end)}`,
  });
  if (event.location) params.set('location', event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// TEXT values: backslash, semicolon, comma and newlines carry meaning in ICS.
const escapeIcsText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

export const buildIcs = (event: CalendarEventInput): string => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lightor//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@lightor.app`,
    `DTSTAMP:${compactUtc(Date.now())}`,
    `DTSTART:${compactUtc(event.start)}`,
    `DTEND:${compactUtc(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  lines.push('STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
};

export const downloadIcs = (event: CalendarEventInput): void => {
  const blob = new Blob([buildIcs(event)], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'appointment.ics';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

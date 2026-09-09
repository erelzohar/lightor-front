import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Schedule from '../../components/Layout/Schedule/Schedule';
import { AppointmentType } from '../../models/AppointmentType';
import { ClassOccurrence } from '../../models/ClassOccurrence';
import { ScheduleConfig } from '../../models/ScheduleConfig';

const HOUR = 3_600_000;
const SUNDAY = Date.now() + 3 * 86_400_000;

const getCalendar = vi.fn();

// jsdom has no IntersectionObserver, and framer-motion's whileInView reaches
// for it during mount — without this the widget never renders at all.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
vi.stubGlobal('IntersectionObserver', NoopObserver);
// jsdom implements no scrolling either; the widget scrolls itself into view
// on every step change.
Element.prototype.scrollIntoView = vi.fn();

// The Turnstile gate is not what this test is about: the stub passes the
// challenge as soon as it mounts, which is what a real visitor's browser does.
vi.mock('@marsidev/react-turnstile', async () => {
  const React = await import('react');
  return {
    Turnstile: ({ onSuccess }: { onSuccess?: (token: string) => void }) => {
      React.useEffect(() => { onSuccess?.('test-token'); }, []);
      return null;
    },
  };
});
vi.mock('../../services/AuthService', () => ({
  default: { handshake: vi.fn().mockResolvedValue(true) },
}));
vi.mock('../../services/AppointmentService', () => ({
  default: { getInstance: () => ({ getCalendar, getAvailability: vi.fn() }) },
}));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars && 'count' in vars ? `${key}:${vars.count}` : key,
    language: 'en',
  }),
}));

const klass = new AppointmentType('t1', 'Group training', '60', 'u1', String(HOUR), 'class', 12, [
  { weekday: 0, time: '19:00' },
]);

const occurrence = (startMs: number, booked: number) =>
  ClassOccurrence.fromJSON({
    type_id: 't1', timestamp: String(startMs), durationMS: String(HOUR), capacity: 12, booked,
  });

const renderWidget = () =>
  render(
    <Schedule
      config={new ScheduleConfig('Book', 'Pick a session')}
      workingDays={[null, null, null, null, null, null, null]}
      user_id="u1"
      phone="+972500000000"
      businessName="Coach"
      timeToCancel={0}
      vacations={[]}
      dateOverrides={[]}
      appointmentTypes={[klass]}
      header={{ style: 'centered' } as never}
      headerScale={'default' as never}
    />
  );

/**
 * A coach who only teaches classes has no working hours, so the month grid
 * would show every day closed (LT-152). The widget opens on the timetable.
 */
describe('booking a class from the public site', () => {
  beforeEach(() => {
    getCalendar.mockReset();
    getCalendar.mockResolvedValue({
      busy: [],
      classes: [occurrence(SUNDAY, 8), occurrence(SUNDAY + 7 * 86_400_000, 12)],
    });
  });

  it('opens on the services rather than the month grid', async () => {
    renderWidget();
    expect(await screen.findByText('Group training')).toBeTruthy();
    expect(screen.queryByText('schedule.select.date')).toBeNull();
  });

  it('lists the upcoming sessions once a class is chosen', async () => {
    renderWidget();

    fireEvent.click(await screen.findByText('Group training'));

    await waitFor(() => expect(screen.getByText('schedule.class.select')).toBeTruthy());
    // Four places left of twelve is not scarce enough to put a number on.
    expect(screen.getByText('schedule.class.available')).toBeTruthy();
    // The following week is sold out.
    expect(screen.getByText('schedule.class.full')).toBeTruthy();
  });

  it('names the number of places only when they are nearly gone', async () => {
    getCalendar.mockResolvedValue({ busy: [], classes: [occurrence(SUNDAY, 10)] });
    renderWidget();

    fireEvent.click(await screen.findByText('Group training'));

    await waitFor(() => expect(screen.getByText('schedule.class.placesLeft:2')).toBeTruthy());
  });

  it('takes a place and moves on to the customer details', async () => {
    renderWidget();

    fireEvent.click(await screen.findByText('Group training'));
    await waitFor(() => expect(screen.getByText('schedule.class.select')).toBeTruthy());

    fireEvent.click(screen.getByText('schedule.class.available'));

    await waitFor(() => expect(screen.getByText('schedule.form.name')).toBeTruthy());
  });

  it('refuses to open a full session', async () => {
    getCalendar.mockResolvedValue({ busy: [], classes: [occurrence(SUNDAY, 12)] });
    renderWidget();

    fireEvent.click(await screen.findByText('Group training'));
    await waitFor(() => expect(screen.getByText('schedule.class.full')).toBeTruthy());

    fireEvent.click(screen.getByText('schedule.class.full'));

    // Still on the timetable; the details form never appeared.
    expect(screen.queryByText('schedule.form.name')).toBeNull();
  });
});

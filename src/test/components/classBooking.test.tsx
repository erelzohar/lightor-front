import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Schedule from '../../components/Layout/Schedule/Schedule';
import { AppointmentType } from '../../models/AppointmentType';
import { ClassOccurrence } from '../../models/ClassOccurrence';
import { ScheduleConfig } from '../../models/ScheduleConfig';

const HOUR = 3_600_000;
const DAY = 86_400_000;

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

/** A local wall-clock instant on the session day, three days from now. */
const at = (hours: number, minutes = 0): number => {
  const day = new Date(Date.now() + 3 * DAY);
  day.setHours(hours, minutes, 0, 0);
  return day.getTime();
};

const klass = new AppointmentType('t1', 'Group training', '60', 'u1', String(HOUR), 'class', 12, [
  { weekday: 0, time: '19:00' },
]);

const occurrence = (startMs: number, booked: number) =>
  ClassOccurrence.fromJSON({
    type_id: 't1', timestamp: String(startMs), durationMS: String(HOUR), capacity: 12, booked,
  });

const openAllWeek = ['09:00-17:00', '09:00-17:00', '09:00-17:00', '09:00-17:00', '09:00-17:00', '09:00-17:00', '09:00-17:00'];

const renderWidget = (types = [klass], workingDays: (string | null)[] = [null, null, null, null, null, null, null]) =>
  render(
    <Schedule
      config={new ScheduleConfig('Book', 'Pick a session')}
      workingDays={workingDays}
      user_id="u1"
      phone="+972500000000"
      businessName="Coach"
      timeToCancel={0}
      vacations={[]}
      dateOverrides={[]}
      appointmentTypes={types}
      header={{ style: 'centered' } as never}
      headerScale={'default' as never}
    />
  );

/** The label DateButton builds for a day, before its availability suffix. */
const dayLabel = (ms: number): string =>
  new Date(ms).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

/** Calendar day buttons only — time buttons start with a digit. */
const dayButtons = (): HTMLElement[] =>
  screen.getAllByRole('button').filter((button) => {
    const label = button.getAttribute('aria-label') ?? '';
    return label.includes(' - ') && !/^\d/.test(label);
  });

const dayButton = (ms: number): HTMLElement | undefined =>
  dayButtons().find((button) => button.getAttribute('aria-label')!.startsWith(`${dayLabel(ms)} - `));

const chooseClass = async () => {
  fireEvent.click(await screen.findByText('Group training'));
  await waitFor(() => expect(screen.getByText('schedule.legend.available')).toBeTruthy());
};

/**
 * One road for every service (LT-155): pick the service, pick a day on the
 * calendar, pick a time. For a class the calendar's open days are the days it
 * runs with room left, and the times are its sessions.
 */
describe('booking a class from the public site', () => {
  beforeEach(() => {
    getCalendar.mockReset();
    getCalendar.mockResolvedValue({ busy: [], classes: [occurrence(at(19), 8)] });
  });

  it('opens on the services rather than the month grid', async () => {
    renderWidget();
    expect(await screen.findByText('Group training')).toBeTruthy();
    expect(screen.queryByText('schedule.legend.available')).toBeNull();
  });

  it('shows the calendar once a class is chosen, like any other service', async () => {
    renderWidget();
    await chooseClass();
  });

  it('opens only the days the class runs with room left', async () => {
    renderWidget();
    await chooseClass();

    const sessionDay = dayButton(at(19));
    expect(sessionDay).toBeTruthy();
    expect(sessionDay!.hasAttribute('disabled')).toBe(false);

    // Every other day on the grid is closed: a coach with no working hours
    // has nothing to offer on them.
    const others = dayButtons().filter((button) => button !== sessionDay);
    expect(others.length).toBeGreaterThan(0);
    expect(others.every((button) => button.hasAttribute('disabled'))).toBe(true);
  });

  it("lists that day's sessions as its times", async () => {
    renderWidget();
    await chooseClass();

    fireEvent.click(dayButton(at(19))!);

    // Four of twelve places left is not scarce, so no number is shown.
    await waitFor(() => expect(screen.getByRole('button', { name: '19:00' })).toBeTruthy());
  });

  it('names the places left only when they are nearly gone, and greys out a full session', async () => {
    getCalendar.mockResolvedValue({
      busy: [],
      classes: [occurrence(at(7), 12), occurrence(at(19), 10)],
    });
    renderWidget();
    await chooseClass();

    fireEvent.click(dayButton(at(19))!);

    const full = await screen.findByRole('button', { name: '07:00 - schedule.class.full' });
    expect(full.hasAttribute('disabled')).toBe(true);

    const scarce = screen.getByRole('button', { name: '19:00 - schedule.class.placesLeft:2' });
    expect(scarce.hasAttribute('disabled')).toBe(false);
  });

  it('takes a place and moves on to the customer details', async () => {
    renderWidget();
    await chooseClass();

    fireEvent.click(dayButton(at(19))!);
    fireEvent.click(await screen.findByRole('button', { name: '19:00' }));

    await waitFor(() => expect(screen.getByText('schedule.form.name')).toBeTruthy());
  });

  it('does not offer a class whose every session is full', async () => {
    const haircut = new AppointmentType('t2', 'Haircut', '80', 'u1', '1800000');
    getCalendar.mockResolvedValue({ busy: [], classes: [occurrence(at(19), 12)] });

    renderWidget([klass, haircut], openAllWeek);

    expect(await screen.findByText('Haircut')).toBeTruthy();
    expect(screen.queryByText('Group training')).toBeNull();
  });

  it('keeps a private service on working hours at a business that also runs classes', async () => {
    const haircut = new AppointmentType('t2', 'Haircut', '80', 'u1', '1800000');
    renderWidget([klass, haircut], openAllWeek);

    fireEvent.click(await screen.findByText('Haircut'));
    await waitFor(() => expect(screen.getByText('schedule.legend.available')).toBeTruthy());

    // Open hours every day means far more open days than the one class day.
    const open = dayButtons().filter((button) => !button.hasAttribute('disabled'));
    expect(open.length).toBeGreaterThan(1);
  });
});

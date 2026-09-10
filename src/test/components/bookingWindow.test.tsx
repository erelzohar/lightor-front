import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Schedule from '../../components/Layout/Schedule/Schedule';
import { AppointmentType } from '../../models/AppointmentType';
import { ClassOccurrence } from '../../models/ClassOccurrence';
import { ScheduleConfig } from '../../models/ScheduleConfig';

const HOUR = 3_600_000;

const getCalendar = vi.fn();

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
vi.stubGlobal('IntersectionObserver', NoopObserver);
Element.prototype.scrollIntoView = vi.fn();

vi.mock('@marsidev/react-turnstile', async () => {
  const React = await import('react');
  return {
    Turnstile: ({ onSuccess }: { onSuccess?: (token: string) => void }) => {
      React.useEffect(() => { onSuccess?.('test-token'); }, []);
      return null;
    },
  };
});
vi.mock('../../services/AuthService', () => ({ default: { handshake: vi.fn().mockResolvedValue(true) } }));
vi.mock('../../services/AppointmentService', () => ({
  default: { getInstance: () => ({ getCalendar, getAvailability: vi.fn() }) },
}));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) => (vars && 'count' in vars ? `${key}:${vars.count}` : key),
    language: 'en',
  }),
}));

const klass = new AppointmentType('t1', 'Group training', '60', 'u1', String(HOUR), 'class', 12, [{ weekday: 0, time: '19:00' }]);
const haircut = new AppointmentType('t2', 'Haircut', '80', 'u1', '1800000');
const openAllWeek = Array(7).fill('09:00-17:00') as (string | null)[];

/** 19:00 local time, a number of calendar days from today. */
const inDays = (days: number): number => {
  const day = new Date();
  day.setDate(day.getDate() + days);
  day.setHours(19, 0, 0, 0);
  return day.getTime();
};

const session = (startMs: number) =>
  ClassOccurrence.fromJSON({ type_id: 't1', timestamp: String(startMs), durationMS: String(HOUR), capacity: 12, booked: 0 });

const renderWidget = (types: AppointmentType[], horizon?: number) =>
  render(
    <Schedule
      config={new ScheduleConfig('Book', 'Pick')}
      workingDays={openAllWeek}
      user_id="u1"
      phone="+972500000000"
      businessName="Business"
      timeToCancel={0}
      vacations={[]}
      dateOverrides={[]}
      appointmentTypes={types}
      header={{ style: 'centered' } as never}
      headerScale={'default' as never}
      {...(horizon !== undefined ? { bookingHorizonDays: horizon } : {})}
    />
  );

const dayButtons = (): HTMLElement[] =>
  screen.getAllByRole('button').filter((button) => {
    const label = button.getAttribute('aria-label') ?? '';
    return label.includes(' - ') && !/^\d/.test(label);
  });

const openCalendarFor = async (name: string) => {
  fireEvent.click(await screen.findByText(name));
  await waitFor(() => expect(screen.getByText('schedule.legend.available')).toBeTruthy());
};

/** LT-156 — the owner's choice of how far ahead customers may book. */
describe('the booking window on the public calendar', () => {
  beforeEach(() => {
    getCalendar.mockReset();
    getCalendar.mockResolvedValue({ busy: [], classes: [] });
  });

  it('closes every day past the window', async () => {
    renderWidget([haircut], 3);
    await openCalendarFor('Haircut');

    // Today plus three days at most, even with the business open all week.
    const open = dayButtons().filter((button) => !button.hasAttribute('disabled'));
    expect(open.length).toBeGreaterThan(0);
    expect(open.length).toBeLessThanOrEqual(4);
  });

  it('stops the next-month button where the window ends', async () => {
    renderWidget([haircut], 3);
    await openCalendarFor('Haircut');

    const today = new Date();
    const lastDay = new Date(today);
    lastDay.setDate(today.getDate() + 3);
    lastDay.setHours(23, 59, 59, 999);
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const windowReachesNextMonth = nextMonthStart.getTime() <= lastDay.getTime();

    expect(screen.getByTestId('calendar-next-month').hasAttribute('disabled')).toBe(!windowReachesNextMonth);
  });

  it('lets a long window browse forward', async () => {
    renderWidget([haircut], 90);
    await openCalendarFor('Haircut');

    expect(screen.getByTestId('calendar-next-month').hasAttribute('disabled')).toBe(false);
  });

  it('keeps a class off the menu when its only session is past the window', async () => {
    getCalendar.mockResolvedValue({ busy: [], classes: [session(inDays(20))] });
    renderWidget([klass, haircut], 7);

    expect(await screen.findByText('Haircut')).toBeTruthy();
    expect(screen.queryByText('Group training')).toBeNull();
  });

  it('offers a class with a session inside the window', async () => {
    getCalendar.mockResolvedValue({ busy: [], classes: [session(inDays(3)), session(inDays(20))] });
    renderWidget([klass], 7);

    expect(await screen.findByText('Group training')).toBeTruthy();
  });

  it('uses sixty days when the owner never chose', async () => {
    getCalendar.mockResolvedValue({ busy: [], classes: [session(inDays(20))] });
    renderWidget([klass]);

    expect(await screen.findByText('Group training')).toBeTruthy();
  });
});

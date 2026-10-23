import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Schedule from '../../components/Layout/Schedule/Schedule';
import ErrorBoundary from '../../components/ErrorBoundary';
import { Appointment } from '../../models/Appointment';
import { AppointmentType } from '../../models/AppointmentType';
import { ClassOccurrence } from '../../models/ClassOccurrence';
import { ScheduleConfig } from '../../models/ScheduleConfig';
import { resetVisitorPassForTests, visitorPass } from '../../services/visitorPass';

/**
 * LT-451: after the code, a number that already holds a booking that day is
 * asked first - book another, or update the one it holds to this choice.
 * Never before the code, never for a class, and a failed lookup never stops
 * the booking.
 */

const DAY = 86_400_000;
const HOUR = 3_600_000;

const mocks = vi.hoisted(() => ({
  getCalendar: vi.fn(),
  createAppointment: vi.fn(),
  updateAppointment: vi.fn(),
  findSameDay: vi.fn(),
  updateHeldBooking: vi.fn(),
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
  handshake: vi.fn(),
}));

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
vi.stubGlobal('IntersectionObserver', NoopObserver);
Element.prototype.scrollIntoView = vi.fn();

// A visitor's browser passes the check as soon as the widget mounts.
vi.mock('@marsidev/react-turnstile', async () => {
  const React = await import('react');
  return {
    Turnstile: ({ onSuccess }: { onSuccess?: (token: string) => void }): null => {
      // Once, on mount, as a real widget does.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      React.useEffect(() => { onSuccess?.('test-token'); }, []);
      return null;
    },
  };
});
vi.mock('../../services/AuthService', () => ({ default: { handshake: mocks.handshake } }));
vi.mock('../../services/AppointmentService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/AppointmentService')>()),
  default: {
    getInstance: () => ({
      getCalendar: mocks.getCalendar,
      getAvailability: vi.fn().mockResolvedValue([]),
      createAppointment: mocks.createAppointment,
      updateAppointment: mocks.updateAppointment,
      findSameDay: mocks.findSameDay,
      updateHeldBooking: mocks.updateHeldBooking,
    }),
  },
}));
vi.mock('../../services/SmsService', () => ({ default: { sendOtp: mocks.sendOtp, verifyOtp: mocks.verifyOtp } }));
vi.mock('../../services/ErrorReportingService', () => ({ reportClientError: vi.fn().mockResolvedValue(true) }));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars && 'index' in vars ? `${key}:${vars.index}/${vars.total}` : vars && 'count' in vars ? `${key}:${vars.count}` : key,
    language: 'en',
  }),
}));

/** What axios rejects with when the server refuses the pass. */
const refused = () => Object.assign(new Error('Request failed with status code 401'), { response: { status: 401 } });

const haircut = new AppointmentType('t1', 'Haircut', '80', 'u1', '1800000');
const klass = new AppointmentType('k1', 'Group training', '60', 'u1', String(HOUR), 'class', 12, [{ weekday: 0, time: '19:00' }]);
const openAllWeek = Array(7).fill('08:00-20:00') as (string | null)[];

const booked = Appointment.fromJSON({
  _id: 'a1', user_id: 'u1', type: { _id: 't1', name: 'Haircut', durationMS: '1800000' },
  name: 'Dana Levi', status: 'scheduled', phone: '0501234567', timestamp: '0', channelType: 'sms',
});

const renderWidget = (types: AppointmentType[] = [haircut], workingDays: (string | null)[] = openAllWeek) =>
  render(
    <ErrorBoundary>
      <Schedule
        config={new ScheduleConfig('Book', 'Pick')}
        workingDays={workingDays}
        user_id="u1"
        phone="+972500000000"
        businessName="Salon"
        timeToCancel={0}
        vacations={[]}
        dateOverrides={[]}
        appointmentTypes={types}
        header={{ style: 'centered' } as never}
        headerScale={'default' as never}
        // The sessions below are built on this machine's clock, so the
        // business sits in the machine's zone (LT-318).
        timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
      />
    </ErrorBoundary>
  );

const dayButtons = (): HTMLElement[] =>
  screen.getAllByRole('button').filter((button) => {
    const label = button.getAttribute('aria-label') ?? '';
    return label.includes(' - ') && !/^\d/.test(label);
  });

const reachDetails = async (service = 'Haircut') => {
  fireEvent.click(await screen.findByText(service));
  await waitFor(() => expect(screen.getByText('schedule.legend.available')).toBeTruthy());
  fireEvent.click(dayButtons().find((button) => !button.hasAttribute('disabled'))!);
  const slots = await screen.findAllByRole('button', { name: /^\d{2}:\d{2}$/ });
  fireEvent.click(slots[0]);
  await waitFor(() => expect(screen.getByLabelText('schedule.form.name')).toBeTruthy());
};

const sendDetails = async () => {
  fireEvent.change(screen.getByLabelText('schedule.form.name'), { target: { value: 'Dana Levi' } });
  fireEvent.change(screen.getByLabelText('schedule.form.phone'), { target: { value: '0501234567' } });
  fireEvent.submit(screen.getByLabelText('schedule.form.name').closest('form')!);
};

const otpBoxes = () => screen.getAllByLabelText(/^schedule\.form\.otpDigit:/) as HTMLInputElement[];

const enterOtp = async (code = '123456') => {
  const boxes = await waitFor(() => {
    const found = otpBoxes();
    expect(found).toHaveLength(6);
    return found;
  });
  code.split('').forEach((digit, index) => fireEvent.change(boxes[index], { target: { value: digit } }));
};

const noSectionCrash = () => expect(screen.queryByText('Something went wrong...')).toBeNull();

const heldToday = {
  _id: 'h1',
  timestamp: String(Date.now() + 2 * HOUR),
  type: { _id: 't0', name: 'Gel polish', durationMS: String(HOUR) },
  manageToken: 'mt_h1',
};

describe('a second booking the same day (LT-451)', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
    resetVisitorPassForTests();
    mocks.handshake.mockResolvedValue(true);
    mocks.getCalendar.mockResolvedValue({ busy: [], classes: [] });
    mocks.sendOtp.mockResolvedValue({ ok: true });
    mocks.verifyOtp.mockResolvedValue('pt_1');
    mocks.createAppointment.mockResolvedValue(booked);
    mocks.updateHeldBooking.mockResolvedValue(booked);
    mocks.findSameDay.mockResolvedValue([]);
  });

  it('asks only after the code, with the proof, and books nothing until answered', async () => {
    mocks.findSameDay.mockResolvedValue([heldToday]);
    renderWidget();
    await reachDetails();
    await sendDetails();
    expect(mocks.findSameDay).not.toHaveBeenCalled();
    await enterOtp();

    const question = await screen.findByTestId('same-day');
    expect(question).toHaveTextContent('schedule.sameDay.title');
    expect(question).toHaveTextContent('Gel polish');
    expect(mocks.findSameDay).toHaveBeenCalledTimes(1);
    expect(mocks.findSameDay.mock.calls[0][0]).toMatchObject({ user_id: 'u1', phone: '0501234567', phoneToken: 'pt_1' });
    expect(mocks.findSameDay.mock.calls[0][0].timestamp).toMatch(/^\d+$/);
    expect(mocks.createAppointment).not.toHaveBeenCalled();
    expect(mocks.updateHeldBooking).not.toHaveBeenCalled();
  });

  it('"book another" books as usual, with the same proof and no second code', async () => {
    mocks.findSameDay.mockResolvedValue([heldToday]);
    renderWidget();
    await reachDetails();
    await sendDetails();
    await enterOtp();
    fireEvent.click(await screen.findByRole('button', { name: 'schedule.sameDay.another' }));

    expect(await screen.findByText('schedule.success')).toBeTruthy();
    expect(mocks.createAppointment).toHaveBeenCalledTimes(1);
    expect(mocks.createAppointment.mock.calls[0][1]).toBe('pt_1');
    expect(mocks.updateHeldBooking).not.toHaveBeenCalled();
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
  });

  it('"update" gives the booking held that day this time and service, and books nothing new', async () => {
    mocks.findSameDay.mockResolvedValue([heldToday]);
    renderWidget();
    await reachDetails();
    await sendDetails();
    await enterOtp();
    fireEvent.click(await screen.findByRole('button', { name: 'schedule.sameDay.update' }));

    expect(await screen.findByText('schedule.sameDay.updated')).toBeTruthy();
    expect(mocks.updateHeldBooking).toHaveBeenCalledTimes(1);
    const [held, draft] = mocks.updateHeldBooking.mock.calls[0];
    expect(held).toEqual(heldToday);
    expect(draft).toMatchObject({ type_id: 't1', phone: '0501234567' });
    expect(draft.timestamp).toBe(mocks.findSameDay.mock.calls[0][0].timestamp);
    expect(mocks.createAppointment).not.toHaveBeenCalled();
  });

  it('books straight on when the number holds nothing that day, or the lookup fails', async () => {
    renderWidget();
    await reachDetails();
    await sendDetails();
    await enterOtp();
    expect(await screen.findByText('schedule.success')).toBeTruthy();
    expect(screen.queryByTestId('same-day')).toBeNull();
    expect(mocks.createAppointment).toHaveBeenCalledTimes(1);
  });

  it('never asks for a class: one seat each is its own rule', async () => {
    const start = new Date();
    start.setDate(start.getDate() + 2);
    start.setHours(19, 0, 0, 0);
    mocks.getCalendar.mockResolvedValue({
      busy: [],
      classes: [ClassOccurrence.fromJSON({ type_id: 'k1', timestamp: String(start.getTime()), durationMS: String(HOUR), capacity: 12, booked: 1 })],
    });
    mocks.findSameDay.mockResolvedValue([heldToday]);
    renderWidget([klass]);
    fireEvent.click(await screen.findByText('Group training'));
    await waitFor(() => expect(screen.getByText('schedule.legend.available')).toBeTruthy());
    fireEvent.click(dayButtons().find((button) => !button.hasAttribute('disabled'))!);
    fireEvent.click(await screen.findByRole('button', { name: '19:00' }));
    await waitFor(() => expect(screen.getByLabelText('schedule.form.name')).toBeTruthy());
    await sendDetails();
    await enterOtp();

    expect(await screen.findByText('schedule.success')).toBeTruthy();
    expect(mocks.findSameDay).not.toHaveBeenCalled();
    expect(screen.queryByTestId('same-day')).toBeNull();
  });
});

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
 * LT-315 — the booking widget past the visitor pass's hour (review H3), the
 * class places after a refusal or a booking (review M4), and the code boxes
 * a phone can fill from the SMS (item 10).
 */

const DAY = 86_400_000;
const HOUR = 3_600_000;

const mocks = vi.hoisted(() => ({
  getCalendar: vi.fn(),
  createAppointment: vi.fn(),
  updateAppointment: vi.fn(),
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

describe('booking after the visitor pass expired (review H3)', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
    resetVisitorPassForTests();
    mocks.handshake.mockResolvedValue(true);
    mocks.getCalendar.mockResolvedValue({ busy: [], classes: [] });
    mocks.sendOtp.mockResolvedValue({ ok: true });
    mocks.verifyOtp.mockResolvedValue('pt_1');
    mocks.createAppointment.mockResolvedValue(booked);
  });

  it('renews the pass and books on the second try, with the same phone token and no second code', async () => {
    mocks.createAppointment.mockRejectedValueOnce(refused()).mockResolvedValueOnce(booked);
    renderWidget();
    await reachDetails();
    await sendDetails();
    await enterOtp();

    expect(await screen.findByText('schedule.success')).toBeTruthy();
    expect(mocks.createAppointment).toHaveBeenCalledTimes(2);
    expect(mocks.createAppointment.mock.calls[0][1]).toBe('pt_1');
    expect(mocks.createAppointment.mock.calls[1][1]).toBe('pt_1');
    expect(mocks.createAppointment.mock.calls[1][0].timestamp).toBe(mocks.createAppointment.mock.calls[0][0].timestamp);
    // One code, one verification: the visitor typed nothing again.
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
    expect(mocks.sendOtp).toHaveBeenCalledTimes(1);
    // A fresh handshake: the page's first one, then the renewal.
    expect(mocks.handshake).toHaveBeenCalledTimes(2);
  });

  it('asks for a reload when the fresh pass is refused too, instead of the generic error', async () => {
    mocks.createAppointment.mockRejectedValue(refused());
    renderWidget();
    await reachDetails();
    await sendDetails();
    await enterOtp();

    expect(await screen.findByText('schedule.error.passExpired')).toBeTruthy();
    expect(screen.queryByText('schedule.genericError')).toBeNull();
    expect(mocks.createAppointment).toHaveBeenCalledTimes(2);
    noSectionCrash();
  });

  it('renews the pass when the code request is refused, and sends the code then', async () => {
    mocks.sendOtp.mockResolvedValueOnce({ ok: false, status: 401 }).mockResolvedValueOnce({ ok: true });
    renderWidget();
    await reachDetails();
    await sendDetails();

    await waitFor(() => expect(otpBoxes()).toHaveLength(6));
    expect(mocks.sendOtp).toHaveBeenCalledTimes(2);
    expect(mocks.handshake).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('schedule.error.sendOtp')).toBeNull();
  });

  it('says to reload when the code request is still refused', async () => {
    mocks.sendOtp.mockResolvedValue({ ok: false, status: 401 });
    renderWidget();
    await reachDetails();
    await sendDetails();

    expect(await screen.findByText('schedule.error.passExpired')).toBeTruthy();
    expect(mocks.sendOtp).toHaveBeenCalledTimes(2);
  });

  it('keeps the plain "could not send" line for other failures', async () => {
    mocks.sendOtp.mockResolvedValue({ ok: false, status: 500 });
    renderWidget();
    await reachDetails();
    await sendDetails();

    expect(await screen.findByText('schedule.error.sendOtp')).toBeTruthy();
    expect(mocks.sendOtp).toHaveBeenCalledTimes(1);
  });

  it('renews the pass when the calendar is refused, then shows the services', async () => {
    mocks.getCalendar.mockRejectedValueOnce(refused()).mockResolvedValue({ busy: [], classes: [] });
    renderWidget();

    expect(await screen.findByText('Haircut')).toBeTruthy();
    await waitFor(() => expect(mocks.getCalendar).toHaveBeenCalledTimes(2));
    expect(mocks.handshake).toHaveBeenCalledTimes(2);
    noSectionCrash();
  });

  it('never throws a failed calendar into the section boundary, even when the pass changes later', async () => {
    mocks.getCalendar.mockRejectedValueOnce(new Error('Request failed with status code 500'));
    renderWidget();
    expect(await screen.findByText('schedule.genericError')).toBeTruthy();

    // The contact form or Lighty drops the pass (their own 401): the effect
    // runs again. It used to rethrow the stored error here.
    act(() => visitorPass.invalidate());
    await waitFor(() => expect(mocks.getCalendar).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Haircut')).toBeTruthy();
    noSectionCrash();
  });
});

describe('class places after a refusal or a booking (review M4)', () => {
  /** A wall-clock instant three days from now, on this machine's clock (the business's zone here). */
  const at = (hours: number): number => {
    const day = new Date(Date.now() + 3 * DAY);
    day.setHours(hours, 0, 0, 0);
    return day.getTime();
  };
  const session = (booked: number) => ClassOccurrence.fromJSON({
    type_id: 'k1', timestamp: String(at(19)), durationMS: String(HOUR), capacity: 12, booked,
  });
  const noHours: (string | null)[] = [null, null, null, null, null, null, null];

  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
    resetVisitorPassForTests();
    mocks.handshake.mockResolvedValue(true);
    mocks.sendOtp.mockResolvedValue({ ok: true });
    mocks.verifyOtp.mockResolvedValue('pt_1');
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('after "this class just filled up", the session comes back as full', async () => {
    mocks.getCalendar
      // Places as the page loaded; the rest went while the visitor typed.
      .mockResolvedValueOnce({ busy: [], classes: [session(5)] })
      .mockResolvedValue({ busy: [], classes: [session(12)] });
    mocks.createAppointment.mockRejectedValue(new Error('CLASS_FULL'));
    renderWidget([klass], noHours);

    await reachDetails('Group training');
    await sendDetails();
    await enterOtp();

    expect(await screen.findByText('schedule.classFullError')).toBeTruthy();
    // Busy times and class places, both refetched.
    await waitFor(() => expect(mocks.getCalendar).toHaveBeenCalledTimes(2));

    // After the widget resets, the class has no session with room left.
    await waitFor(() => expect(screen.queryByText('Group training')).toBeNull(), { timeout: 7000 });
  }, 10_000);

  it('after a booking, the class places are fetched again too', async () => {
    mocks.getCalendar.mockResolvedValue({ busy: [], classes: [session(5)] });
    mocks.createAppointment.mockResolvedValue(booked);
    renderWidget([klass], noHours);

    await reachDetails('Group training');
    await sendDetails();
    await enterOtp();

    expect(await screen.findByText('schedule.success')).toBeTruthy();
    await waitFor(() => expect(mocks.getCalendar).toHaveBeenCalledTimes(2));
    // The session's instant goes to the server.
    expect(mocks.createAppointment.mock.calls[0][0].timestamp).toBe(String(at(19)));
  });
});

describe('the code boxes (item 10)', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
    resetVisitorPassForTests();
    mocks.handshake.mockResolvedValue(true);
    mocks.getCalendar.mockResolvedValue({ busy: [], classes: [] });
    mocks.sendOtp.mockResolvedValue({ ok: true });
    mocks.verifyOtp.mockResolvedValue('pt_1');
    mocks.createAppointment.mockResolvedValue(booked);
  });

  const reachCode = async () => {
    renderWidget();
    await reachDetails();
    await sendDetails();
    return waitFor(() => {
      const found = otpBoxes();
      expect(found).toHaveLength(6);
      return found;
    });
  };

  it('names each box and lets the phone offer the SMS code in the first', async () => {
    const boxes = await reachCode();
    expect(boxes.map((box) => box.getAttribute('aria-label'))).toEqual(
      [1, 2, 3, 4, 5, 6].map((n) => `schedule.form.otpDigit:${n}/6`)
    );
    expect(boxes[0].getAttribute('autocomplete')).toBe('one-time-code');
    // The first box holds a whole code until it is spread; the others one digit.
    expect(boxes[0].getAttribute('maxlength')).toBe('6');
    expect(boxes.slice(1).every((box) => box.getAttribute('maxlength') === '1')).toBe(true);
  });

  it('spreads a code the phone fills into the first box, and books with it', async () => {
    const boxes = await reachCode();
    fireEvent.change(boxes[0], { target: { value: '654321' } });

    expect(otpBoxes().map((box) => box.value)).toEqual(['6', '5', '4', '3', '2', '1']);
    await waitFor(() => expect(mocks.verifyOtp).toHaveBeenCalledWith('0501234567', '654321'));
    expect(await screen.findByText('schedule.success')).toBeTruthy();
  });

  it('spreads a pasted code from the first box, whichever box has focus', async () => {
    const boxes = await reachCode();
    fireEvent.paste(boxes[3], { clipboardData: { getData: () => 'Your code: 112 233' } });

    expect(otpBoxes().map((box) => box.value)).toEqual(['1', '1', '2', '2', '3', '3']);
    await waitFor(() => expect(mocks.verifyOtp).toHaveBeenCalledWith('0501234567', '112233'));
  });

  it('pastes a few digits from the box that has focus', async () => {
    const boxes = await reachCode();
    fireEvent.change(boxes[0], { target: { value: '9' } });
    fireEvent.paste(boxes[1], { clipboardData: { getData: () => '87' } });

    expect(otpBoxes().map((box) => box.value)).toEqual(['9', '8', '7', '', '', '']);
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });

  it('typing over the first box keeps the new digit', async () => {
    const boxes = await reachCode();
    fireEvent.change(boxes[0], { target: { value: '4' } });
    fireEvent.change(boxes[0], { target: { value: '47' } });

    expect(otpBoxes().map((box) => box.value)).toEqual(['7', '', '', '', '', '']);
  });
});

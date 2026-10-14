import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Schedule from '../../components/Layout/Schedule/Schedule';
import { Appointment } from '../../models/Appointment';
import { AppointmentType } from '../../models/AppointmentType';
import { ScheduleConfig } from '../../models/ScheduleConfig';
import { resetVisitorPassForTests } from '../../services/visitorPass';

/**
 * Review M1 (LT-315): the booking widget keeps the business's clock,
 * Israel's, on a phone set to any zone. Before, a London phone saw the
 * owner's 09:00-17:00 as London hours, and its 16:00 was stored as 18:00 in
 * Israel — after closing, and so said the SMS.
 */

const mocks = vi.hoisted(() => ({
  getCalendar: vi.fn(),
  createAppointment: vi.fn(),
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
}));

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
vi.stubGlobal('IntersectionObserver', NoopObserver);
Element.prototype.scrollIntoView = vi.fn();

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
vi.mock('../../services/AuthService', () => ({ default: { handshake: vi.fn().mockResolvedValue(true) } }));
vi.mock('../../services/AppointmentService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/AppointmentService')>()),
  default: {
    getInstance: () => ({
      getCalendar: mocks.getCalendar,
      getAvailability: vi.fn().mockResolvedValue([]),
      createAppointment: mocks.createAppointment,
    }),
  },
}));
vi.mock('../../services/SmsService', () => ({ default: { sendOtp: mocks.sendOtp, verifyOtp: mocks.verifyOtp } }));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

const hourLong = new AppointmentType('t1', 'Consultation', '200', 'u1', '3600000');
const nineToFive = Array(7).fill('09:00-17:00') as (string | null)[];

const booked = Appointment.fromJSON({
  _id: 'a1', user_id: 'u1', type: { _id: 't1', name: 'Consultation', durationMS: '3600000' },
  name: 'Dana Levi', status: 'scheduled', phone: '0501234567', timestamp: '0', channelType: 'sms',
});

const renderWidget = (extra: Partial<React.ComponentProps<typeof Schedule>> = {}) =>
  render(
    <Schedule
      config={new ScheduleConfig('Book', 'Pick')}
      workingDays={nineToFive}
      user_id="u1"
      phone=""
      businessName="Clinic"
      timeToCancel={0}
      vacations={[]}
      dateOverrides={[]}
      appointmentTypes={[hourLong]}
      header={{ style: 'centered' } as never}
      headerScale={'default' as never}
      {...extra}
    />
  );

/** The calendar's button for a day, e.g. "Wednesday, October 21". */
const dayButton = (label: string): HTMLElement | undefined =>
  screen.getAllByRole('button').find((button) => (button.getAttribute('aria-label') ?? '').startsWith(`${label} - `));

const times = async (): Promise<string[]> =>
  (await screen.findAllByRole('button', { name: /^\d{2}:\d{2}$/ })).map((button) => button.textContent!);

const openDay = async (label: string) => {
  fireEvent.click(await screen.findByText('Consultation'));
  await waitFor(() => expect(screen.getByText('schedule.legend.available')).toBeTruthy());
  fireEvent.click(dayButton(label)!);
};

const book = async (time: string) => {
  fireEvent.click(await screen.findByRole('button', { name: time }));
  fireEvent.change(await screen.findByLabelText('schedule.form.name'), { target: { value: 'Dana Levi' } });
  fireEvent.change(screen.getByLabelText('schedule.form.phone'), { target: { value: '0501234567' } });
  fireEvent.submit(screen.getByLabelText('schedule.form.name').closest('form')!);
  const boxes = await screen.findAllByLabelText('schedule.form.otpDigit');
  expect(boxes).toHaveLength(6);
  // The phone fills the whole code into the first box.
  fireEvent.change(boxes[0], { target: { value: '123456' } });
  await waitFor(() => expect(mocks.createAppointment).toHaveBeenCalledTimes(1));
  return Number(mocks.createAppointment.mock.calls[0][0].timestamp);
};

describe.each(['Europe/London', 'America/New_York'])('a visitor whose phone is set to %s', (zone) => {
  beforeEach(() => {
    // Node picks up a changed TZ at once: the device's zone, for real.
    vi.stubEnv('TZ', zone);
    Object.values(mocks).forEach((fn) => fn.mockReset());
    resetVisitorPassForTests();
    mocks.getCalendar.mockResolvedValue({ busy: [], classes: [] });
    mocks.sendOtp.mockResolvedValue({ ok: true });
    mocks.verifyOtp.mockResolvedValue('pt_1');
    mocks.createAppointment.mockResolvedValue(booked);
    vi.useFakeTimers({ toFake: ['Date'] });
    // Tuesday 2026-10-20, 07:00 in Israel.
    vi.setSystemTime(Date.UTC(2026, 9, 20, 4, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("is offered the owner's hours as Israel keeps them, and 16:00 books 16:00 in Israel", async () => {
    renderWidget();
    await openDay('Wednesday, October 21');

    expect(await times()).toEqual(['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']);
    // 16:00 in Israel on 2026-10-21 (UTC+3) is 13:00 UTC.
    expect(await book('16:00')).toBe(Date.UTC(2026, 9, 21, 13, 0));
  });

  it('books across Israel’s clock change at the Israeli winter offset', async () => {
    renderWidget();
    await openDay('Monday, October 26');

    // 16:00 in Israel on 2026-10-26 (UTC+2 since the 25th) is 14:00 UTC.
    expect(await book('16:00')).toBe(Date.UTC(2026, 9, 26, 14, 0));
  });

  it("shows a booking being moved at Israel's time", async () => {
    const at1600 = Appointment.fromJSON({ ...booked, timestamp: String(Date.UTC(2026, 9, 22, 13, 0)), type: { ...booked.type } });
    renderWidget({ isUpdating: true, appointmentToUpdate: at1600, onCancelUpdate: () => {} });

    // en-US, twelve-hour: 16:00 in Israel, whatever the phone's own clock says.
    expect(await screen.findByText('04:00 PM')).toBeTruthy();
    expect(screen.getByText('Thursday, October 22')).toBeTruthy();
  });
});

describe('late in the evening on a phone in New York', () => {
  beforeEach(() => {
    vi.stubEnv('TZ', 'America/New_York');
    Object.values(mocks).forEach((fn) => fn.mockReset());
    resetVisitorPassForTests();
    mocks.getCalendar.mockResolvedValue({ busy: [], classes: [] });
    vi.useFakeTimers({ toFake: ['Date'] });
    // 00:30 on Wednesday the 21st in Israel — still 18:30 on Tuesday in New York.
    vi.setSystemTime(Date.UTC(2026, 9, 20, 21, 30));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("starts the calendar on Israel's today: Tuesday is over, Wednesday is open from 09:00", async () => {
    // Open until 21:00 in Israel.
    renderWidget({ workingDays: Array(7).fill('09:00-21:00') });
    fireEvent.click(await screen.findByText('Consultation'));
    await waitFor(() => expect(screen.getByText('schedule.legend.available')).toBeTruthy());

    // Before, Tuesday still had New York's 19:00 and 20:00 on offer — past
    // midnight in Israel, after closing on a day that is already over.
    expect(dayButton('Tuesday, October 20')!.hasAttribute('disabled')).toBe(true);
    fireEvent.click(dayButton('Wednesday, October 21')!);
    expect((await times())[0]).toBe('09:00');
  });
});

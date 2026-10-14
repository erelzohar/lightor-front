import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Schedule from '../../components/Layout/Schedule/Schedule';
import { AppointmentType } from '../../models/AppointmentType';
import { ScheduleConfig } from '../../models/ScheduleConfig';

/**
 * LT-318 — the calendar runs on the business's clock, not the visitor's.
 *
 * EZ-lines, the predecessor, built slots with the device clock: a phone set
 * one zone ahead of the business saw "11:00" as free while it was taken, was
 * texted "11:00", and the booking was saved at 10:00.
 *
 * The business here is on Kiritimati (UTC+14, no daylight saving), a zone no
 * machine running these tests is in, so the device clock and the business
 * clock always disagree — by a whole calendar day, too.
 */
const BUSINESS_TZ = 'Pacific/Kiritimati';
// 10:00 on Wednesday 12 June 2030 in the business; 11 June on most devices.
const NOW = Date.UTC(2030, 5, 11, 20, 0);
const businessTime = (hour: number, minute: number) => Date.UTC(2030, 5, 12, hour, minute) - 14 * 3_600_000;

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

const haircut = new AppointmentType('t1', 'Haircut', '80', 'u1', '1800000');

const renderWidget = () =>
  render(
    <Schedule
      config={new ScheduleConfig('Book', 'Pick')}
      workingDays={Array(7).fill('09:00-17:00') as (string | null)[]}
      user_id="u1"
      phone="+972500000000"
      businessName="Salon"
      timeToCancel={0}
      vacations={[]}
      dateOverrides={[]}
      appointmentTypes={[haircut]}
      header={{ style: 'centered' } as never}
      headerScale={'default' as never}
      timeZone={BUSINESS_TZ}
    />
  );

const openDays = (): HTMLElement[] =>
  screen.getAllByRole('button').filter((button) => {
    const label = button.getAttribute('aria-label') ?? '';
    return label.includes(' - ') && !/^\d/.test(label) && !button.hasAttribute('disabled');
  });

const timesOnFirstOpenDay = async () => {
  fireEvent.click(await screen.findByText('Haircut'));
  await waitFor(() => expect(screen.getByText('schedule.legend.available')).toBeTruthy());
  const first = openDays()[0];
  fireEvent.click(first);
  const times = await screen.findAllByRole('button', { name: /^\d{2}:\d{2}$/ });
  return { day: first.getAttribute('aria-label')!, times: times.map((t) => t.textContent) };
};

describe('booking on the business clock (LT-318)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    Object.values(mocks).forEach((fn) => fn.mockReset());
    // 11:00 in the business is taken.
    mocks.getCalendar.mockResolvedValue({ busy: [{ timestamp: String(businessTime(11, 0)), durationMS: '1800000' }], classes: [] });
    mocks.sendOtp.mockResolvedValue(true);
    mocks.verifyOtp.mockResolvedValue('pt_1');
    mocks.createAppointment.mockImplementation(async (body: { timestamp: string }) => ({ _id: 'n1', ...body }));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens on the business's today and offers its hours, not the device's", async () => {
    renderWidget();
    const { day, times } = await timesOnFirstOpenDay();

    expect(day.startsWith('Wednesday, June 12 - ')).toBe(true);
    // It is 10:00 there: 10:30 is the first time still ahead.
    expect(times[0]).toBe('10:30');
  });

  it('keeps the taken 11:00 off the list', async () => {
    renderWidget();
    const { times } = await timesOnFirstOpenDay();

    expect(times).not.toContain('11:00');
    expect(times).toContain('11:30');
  });

  it('saves the time the customer picked on the business clock', async () => {
    renderWidget();
    await timesOnFirstOpenDay();
    fireEvent.click(screen.getByRole('button', { name: '11:30' }));

    fireEvent.change(await screen.findByLabelText('schedule.form.name'), { target: { value: 'Dana Levi' } });
    fireEvent.change(screen.getByLabelText('schedule.form.phone'), { target: { value: '0501234567' } });
    fireEvent.submit(screen.getByLabelText('schedule.form.name').closest('form')!);

    const boxes = await waitFor(() => {
      const found = screen.getAllByRole('textbox').filter((input) => input.getAttribute('maxlength') === '1');
      expect(found).toHaveLength(6);
      return found;
    });
    boxes.forEach((box, index) => fireEvent.change(box, { target: { value: String(index + 1) } }));

    await waitFor(() => expect(mocks.createAppointment).toHaveBeenCalledTimes(1));
    expect(mocks.createAppointment.mock.calls[0][0].timestamp).toBe(String(businessTime(11, 30)));
  });
});

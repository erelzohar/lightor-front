import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Schedule from '../../components/Layout/Schedule/Schedule';
import ErrorBoundary from '../../components/ErrorBoundary';
import { Appointment } from '../../models/Appointment';
import { AppointmentType } from '../../models/AppointmentType';
import { ScheduleConfig } from '../../models/ScheduleConfig';
import { resetVisitorPassForTests } from '../../services/visitorPass';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

/**
 * LT-600 (Erel 2026-11-06): a business in its free days sends no WhatsApp.
 * The server says so (`whatsapp: false`); the form then shows no SMS/WhatsApp
 * switch and asks for the code, and books, by SMS. The site's address goes
 * with the code so the server can tell the business on its own.
 */


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


const haircut = new AppointmentType('t1', 'Haircut', '80', 'u1', '1800000');
const openAllWeek = Array(7).fill('08:00-20:00') as (string | null)[];

const booked = Appointment.fromJSON({
  _id: 'a1', user_id: 'u1', type: { _id: 't1', name: 'Haircut', durationMS: '1800000' },
  name: 'Dana Levi', status: 'scheduled', phone: '0501234567', timestamp: '0', channelType: 'sms',
});

const renderWidget = (whatsapp?: boolean, types: AppointmentType[] = [haircut], workingDays: (string | null)[] = openAllWeek) =>
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
        whatsapp={whatsapp}
        subdomain="salon"
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


describe('the SMS/WhatsApp switch', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
    resetVisitorPassForTests();
    mocks.handshake.mockResolvedValue(true);
    mocks.getCalendar.mockResolvedValue({ busy: [], classes: [] });
    mocks.sendOtp.mockResolvedValue({ ok: true });
    mocks.verifyOtp.mockResolvedValue('pt_1');
    mocks.createAppointment.mockResolvedValue(booked);
  });

  it('is gone in the free days, and the code and the booking go by SMS', async () => {
    renderWidget(false);
    await reachDetails();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByText('schedule.channel.sms')).toBeNull();

    await sendDetails();
    await waitFor(() => expect(otpBoxes()).toHaveLength(6));
    expect(screen.queryByRole('switch')).toBeNull();
    expect(mocks.sendOtp).toHaveBeenCalledWith('0501234567', 'sms', undefined, 'salon');

    await enterOtp();
    expect(await screen.findByText('schedule.success')).toBeTruthy();
    expect(mocks.createAppointment.mock.calls[0][0].channelType).toBe('sms');
  });

  it('is offered everywhere else, and a WhatsApp pick reaches the code and the booking', async () => {
    renderWidget();
    await reachDetails();
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByText('schedule.channel.whatsapp')).toBeTruthy();

    await sendDetails();
    await waitFor(() => expect(otpBoxes()).toHaveLength(6));
    expect(mocks.sendOtp).toHaveBeenCalledWith('0501234567', 'whatsapp', undefined, 'salon');
    await enterOtp();
    expect(await screen.findByText('schedule.success')).toBeTruthy();
    expect(mocks.createAppointment.mock.calls[0][0].channelType).toBe('whatsapp');
  });

  it("reads the server's flag: off only when it says false", () => {
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, whatsapp: false }).whatsapp).toBe(false);
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, whatsapp: true }).whatsapp).toBe(true);
    // Older payloads and the previews.
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE }).whatsapp).toBe(true);
  });
});

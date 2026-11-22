import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Schedule from '../../components/Layout/Schedule/Schedule';
import About from '../../components/Layout/About';
import Contact from '../../components/Layout/Contact';
import Hours from '../../components/blocks/Hours';
import ManageAppointment from '../../components/ManageAppointment';
import { Appointment } from '../../models/Appointment';
import { AppointmentType } from '../../models/AppointmentType';
import { ScheduleConfig } from '../../models/ScheduleConfig';
import { AboutConfig } from '../../models/AboutConfig';
import { ContactConfig } from '../../models/ContactConfig';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { resetVisitorPassForTests } from '../../services/visitorPass';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

/**
 * LT-702: a business in the United States (its business phone is +1) shows
 * its visitors the 12-hour clock: the slot buttons, the booking summary, the
 * opening hours and the manage-booking page. The booking still sends the
 * time the slot stands for. An Israeli business's site is unchanged.
 */

const US_PHONE = '+12125550142';
const IL_PHONE = '+972501234567';
const NEW_YORK = 'America/New_York';
const LRI = '⁦';
const PDI = '⁩';

const lang = vi.hoisted(() => ({ current: 'en' }));
const mocks = vi.hoisted(() => ({
  getCalendar: vi.fn(),
  createAppointment: vi.fn(),
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
  getAppointmentById: vi.fn(),
  getWebConfig: vi.fn(),
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
      getAppointmentById: mocks.getAppointmentById,
    }),
  },
}));
vi.mock('../../services/WebConfigService', () => ({ default: { getInstance: () => ({ getWebConfig: mocks.getWebConfig }) } }));
vi.mock('../../services/SmsService', () => ({ default: { sendOtp: mocks.sendOtp, verifyOtp: mocks.verifyOtp, sendContactMessage: vi.fn() } }));
vi.mock('../../hooks/useTheme', () => ({ useTheme: () => {} }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useParams: () => ({ 'appointment-id': 'a1' }),
  useNavigate: () => vi.fn(),
}));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) => (vars && 'time' in vars ? `${key} ${vars.time}` : key),
    language: lang.current,
    setContentLanguage: () => {},
  }),
}));

const hourLong = new AppointmentType('t1', 'Consultation', '200', 'u1', '3600000');
const booked = Appointment.fromJSON({
  _id: 'a1', user_id: 'u1', type: { _id: 't1', name: 'Consultation', durationMS: '3600000' },
  name: 'Dana Levi', status: 'scheduled', phone: '0501234567', timestamp: '0', channelType: 'sms',
});

const renderWidget = (phone: string, timeZone: string) =>
  render(
    <Schedule
      config={new ScheduleConfig('Book', 'Pick')}
      workingDays={Array(7).fill('09:00-17:00') as (string | null)[]}
      user_id="u1"
      phone={phone}
      businessName="Studio"
      timeToCancel={0}
      vacations={[]}
      dateOverrides={[]}
      appointmentTypes={[hourLong]}
      header={{ style: 'centered' } as never}
      headerScale={'default' as never}
      timeZone={timeZone}
    />
  );

const dayButton = (label: string): HTMLElement | undefined =>
  screen.getAllByRole('button').find((button) => (button.getAttribute('aria-label') ?? '').startsWith(`${label} - `));

const openDay = async (label: string) => {
  fireEvent.click(await screen.findByText('Consultation'));
  await waitFor(() => expect(screen.getByText('schedule.legend.available')).toBeTruthy());
  fireEvent.click(dayButton(label)!);
};

const slotLabels = async (pattern: RegExp): Promise<string[]> =>
  (await screen.findAllByRole('button', { name: pattern })).map((button) => button.textContent!);

const bookFrom = async (label: string): Promise<number> => {
  fireEvent.click(await screen.findByRole('button', { name: label }));
  fireEvent.change(await screen.findByLabelText('schedule.form.name'), { target: { value: 'Dana Levi' } });
  fireEvent.change(screen.getByLabelText('schedule.form.phone'), { target: { value: '0501234567' } });
  fireEvent.submit(screen.getByLabelText('schedule.form.name').closest('form')!);
  const boxes = await screen.findAllByLabelText('schedule.form.otpDigit');
  fireEvent.change(boxes[0], { target: { value: '123456' } });
  await waitFor(() => expect(mocks.createAppointment).toHaveBeenCalledTimes(1));
  return Number(mocks.createAppointment.mock.calls[0][0].timestamp);
};

describe('the booking flow (LT-702)', () => {
  beforeEach(() => {
    lang.current = 'en';
    Object.values(mocks).forEach((fn) => fn.mockReset());
    resetVisitorPassForTests();
    mocks.getCalendar.mockResolvedValue({ busy: [], classes: [] });
    mocks.sendOtp.mockResolvedValue({ ok: true });
    mocks.verifyOtp.mockResolvedValue('pt_1');
    mocks.createAppointment.mockResolvedValue(booked);
    vi.useFakeTimers({ toFake: ['Date'] });
    // Tuesday 2026-10-20, 07:00 in New York and 14:00 in Israel.
    vi.setSystemTime(Date.UTC(2026, 9, 20, 11, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('an American site: 12-hour slot buttons and summary, and 3:00 PM still books 15:00 New York time', async () => {
    renderWidget(US_PHONE, NEW_YORK);
    await openDay('Wednesday, October 21');

    expect(await slotLabels(/^\d{1,2}:\d{2} [AP]M$/)).toEqual(['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM']);
    expect(screen.queryByRole('button', { name: '15:00' })).toBeNull();

    const timestamp = await bookFrom('3:00 PM');
    // 15:00 in New York on 2026-10-21 (UTC-4) is 19:00 UTC: the slot's "15:00".
    expect(timestamp).toBe(Date.UTC(2026, 9, 21, 19, 0));
  });

  it('an American site shows the picked time on the summary', async () => {
    renderWidget(US_PHONE, NEW_YORK);
    await openDay('Wednesday, October 21');
    fireEvent.click(await screen.findByRole('button', { name: '12:00 PM' }));
    expect(await screen.findByText('12:00 PM')).toBeInTheDocument();
    expect(screen.queryByText('12:00')).toBeNull();
  });

  it('an American site in Hebrew: 12-hour buttons kept left to right', async () => {
    lang.current = 'he';
    renderWidget(US_PHONE, NEW_YORK);
    fireEvent.click(await screen.findByText('Consultation'));
    await waitFor(() => expect(screen.getByText('schedule.legend.available')).toBeTruthy());
    const day = screen.getAllByRole('button').find((b) => (b.getAttribute('aria-label') ?? '').includes('21') && !b.hasAttribute('disabled'));
    fireEvent.click(day!);
    const labels = await slotLabels(/[AP]M/);
    expect(labels[6]).toBe(`${LRI}3:00 PM${PDI}`);
  });

  it('an Israeli site keeps "15:00" on the buttons and books 15:00 Israel time', async () => {
    renderWidget(IL_PHONE, 'Asia/Jerusalem');
    await openDay('Wednesday, October 21');

    expect(await slotLabels(/^\d{2}:\d{2}$/)).toEqual(['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']);
    expect(screen.queryByRole('button', { name: '3:00 PM' })).toBeNull();
    const timestamp = await bookFrom('15:00');
    expect(timestamp).toBe(Date.UTC(2026, 9, 21, 12, 0));
  });
});

const about = AboutConfig.fromJSON({ visible: true, title: 'About', description: '', paragraphs: { intro: 'Hello', mission: '' }, features: [] });
const WEEK: (string | null)[] = [null, '09:00-17:00', '00:00-02:00', '09:00-13:00,16:00-19:00', null, null, null];
const site = (phone: string) => ({ address: {}, contact: { phone, mail: 'a@b.co' }, social: { instagram: '', facebook: '', tiktok: '' }, workingDays: WEEK }) as never;

const aboutHours = (phone: string) => {
  const view = render(<About config={about} websiteConfig={site(phone)} parts={['visit']} />);
  return { view, text: document.body.textContent ?? '' };
};
const contactHours = (phone: string) => {
  const view = render(
    <Contact
      config={new ContactConfig(true, 'Contact', '')}
      contact={{ phone, mail: 'a@b.co' }}
      workingDays={WEEK}
      layout="poster"
      conversion="lead"
      leadsOpen={false}
    />
  );
  return { view, text: document.body.textContent ?? '' };
};

describe('opening hours (LT-702)', () => {
  beforeEach(() => { lang.current = 'en'; });

  it.each([['About', aboutHours], ['Contact', contactHours]] as const)('%s: an American site on the 12-hour clock in English', (_name, draw) => {
    const { text } = draw(US_PHONE);
    expect(text).toContain('9:00 AM - 5:00 PM');
    expect(text).toContain('12:00 AM - 2:00 AM');
    expect(text).toContain('9:00 AM - 1:00 PM, 4:00 PM - 7:00 PM');
  });

  it.each([['About', aboutHours], ['Contact', contactHours]] as const)('%s: an American site on the 12-hour clock in Hebrew too', (_name, draw) => {
    lang.current = 'he';
    const { text } = draw(US_PHONE);
    expect(text).toContain(`${LRI}9:00 AM - 5:00 PM${PDI}`);
    expect(text).not.toContain('09:00-17:00');
  });

  it.each([['About', aboutHours], ['Contact', contactHours]] as const)('%s: an Israeli site keeps raw Hebrew ranges', (_name, draw) => {
    lang.current = 'he';
    const { text } = draw(IL_PHONE);
    expect(text).toContain('09:00-17:00');
    expect(text).toContain('09:00-13:00, 16:00-19:00');
    expect(text).not.toContain('AM');
  });

  it.each([['About', aboutHours], ['Contact', contactHours]] as const)('%s: an Israeli site in English: 12-hour, midnight now 12:00 AM', (_name, draw) => {
    const { text } = draw(IL_PHONE);
    expect(text).toContain('9:00 AM - 5:00 PM');
    expect(text).toContain('12:00 AM - 2:00 AM');
    expect(text).not.toMatch(/(^|[^1])0:00 AM/);
  });

  it('the hours block: American 12-hour, Israeli raw', () => {
    const us = render(<Hours workingDays={WEEK} phone={US_PHONE} />);
    expect(us.container.textContent).toContain('9:00 AM - 5:00 PM');
    us.unmount();
    const il = render(<Hours workingDays={WEEK} phone={IL_PHONE} />);
    expect(il.container.textContent).toContain('09:00-17:00');
    expect(il.container.textContent).not.toContain('AM');
  });
});

describe('the manage-booking page (LT-702)', () => {
  // Wednesday 2026-12-02, 15:00 in New York (UTC-5) and 22:00 in Israel.
  const AT = Date.UTC(2026, 11, 2, 20, 0);
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 10, 25, 12, 0));
    mocks.getAppointmentById.mockResolvedValue(Appointment.fromJSON({
      _id: 'a1', user_id: 'u1', type: { _id: 't1', name: 'Consultation', durationMS: '3600000' },
      name: 'Dana', status: 'scheduled', phone: '0501234567', timestamp: String(AT), channelType: 'sms',
    }));
  });
  afterEach(() => { vi.useRealTimers(); });

  const page = async (phone: string, timeZone: string) => {
    mocks.getWebConfig.mockResolvedValue(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, contact: { phone, mail: 'a@b.co' }, timeZone }));
    render(<ManageAppointment />);
    await screen.findByRole('heading', { level: 1 });
    await act(async () => {});
    return document.body.textContent ?? '';
  };

  it('an American site: "Wednesday, December 2, 2026" and "3:00 PM" in English', async () => {
    lang.current = 'en';
    const text = await page(US_PHONE, NEW_YORK);
    expect(text).toContain('Wednesday, December 2, 2026');
    expect(text).toContain('3:00 PM');
    expect(text).not.toContain('03:00 PM');
  });

  it('an American site in Hebrew: 12-hour, isolated', async () => {
    lang.current = 'he';
    const text = await page(US_PHONE, NEW_YORK);
    expect(text).toContain(`${LRI}3:00 PM${PDI}`);
  });

  it('an Israeli site keeps what it showed: "22:00" in Hebrew, "10:00 PM" in English', async () => {
    lang.current = 'he';
    const he = await page(IL_PHONE, 'Asia/Jerusalem');
    expect(he).toContain('22:00');
    expect(he).not.toContain('PM');
    document.body.innerHTML = '';
    lang.current = 'en';
    const en = await page(IL_PHONE, 'Asia/Jerusalem');
    expect(en).toContain(new Date(AT).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Jerusalem' }));
  });
});

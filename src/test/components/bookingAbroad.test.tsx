import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Schedule from '../../components/Layout/Schedule/Schedule';
import { Appointment } from '../../models/Appointment';
import { AppointmentType } from '../../models/AppointmentType';
import { ScheduleConfig } from '../../models/ScheduleConfig';
import { resetVisitorPassForTests } from '../../services/visitorPass';
import { resetPhoneCountriesForTests } from '../../services/phoneCountries';
import { choose } from '../helpers/dropdown';

/**
 * LT-677 - booking with a number abroad. An Israeli number travels the road
 * it always did (the API sends and checks its code, the booking carries the
 * number as typed). A number of an open country abroad is sent in E.164: its
 * code goes through the code frame, the frame's proof is exchanged at the
 * API for the phone token, and the booking carries the E.164 number.
 *
 * The frame here is a fake: the test reads what the page posted to it and
 * answers as the real one would, from lightor.app and from its own window.
 */

const mocks = vi.hoisted(() => ({
  getCalendar: vi.fn(),
  createAppointment: vi.fn(),
  updateAppointment: vi.fn(),
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
  exchangePhoneProof: vi.fn(),
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
vi.mock('../../services/SmsService', () => ({
  default: { sendOtp: mocks.sendOtp, verifyOtp: mocks.verifyOtp, exchangePhoneProof: mocks.exchangePhoneProof },
}));
vi.mock('../../services/ErrorReportingService', () => ({ reportClientError: vi.fn().mockResolvedValue(true) }));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars && 'index' in vars ? `${key}:${vars.index}/${vars.total}` : vars && 'example' in vars ? `${key}:${vars.example}` : key,
    language: 'en',
  }),
}));

const ORIGIN = 'https://lightor.app';
const haircut = new AppointmentType('t1', 'Haircut', '80', 'u1', '1800000');
const openAllWeek = Array(7).fill('08:00-20:00') as (string | null)[];

const booked = (phone: string) => Appointment.fromJSON({
  _id: 'a1', user_id: 'u1', type: { _id: 't1', name: 'Haircut', durationMS: '1800000' },
  name: 'Dana Levi', status: 'scheduled', phone, timestamp: '0', channelType: 'sms',
});

const renderWidget = (props: Partial<React.ComponentProps<typeof Schedule>> = {}) =>
  render(
    <Schedule
      config={new ScheduleConfig('Book', 'Pick')}
      workingDays={openAllWeek}
      user_id="u1"
      phone="+972500000000"
      businessName="Salon"
      timeToCancel={0}
      vacations={[]}
      dateOverrides={[]}
      appointmentTypes={[haircut]}
      header={{ style: 'centered' } as never}
      headerScale={'default' as never}
      timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
      {...props}
    />
  );

const dayButtons = (): HTMLElement[] =>
  screen.getAllByRole('button').filter((button) => {
    const label = button.getAttribute('aria-label') ?? '';
    return label.includes(' - ') && !/^\d/.test(label);
  });

/** Service (a new booking only), day, time: up to the details form. */
const reachDetails = async ({ service = 'Haircut' as string | null } = {}) => {
  if (service) fireEvent.click(await screen.findByText(service));
  await waitFor(() => expect(screen.getByText('schedule.legend.available')).toBeTruthy());
  fireEvent.click(dayButtons().find((button) => !button.hasAttribute('disabled'))!);
  const slots = await screen.findAllByRole('button', { name: /^\d{2}:\d{2}$/ });
  fireEvent.click(slots[0]);
  await waitFor(() => expect(screen.getByLabelText('schedule.form.name')).toBeTruthy());
};

/** An example number inside a sentence: wrapped in marks that keep it left to right. */
const example = (number: string) => `\u2066${number}\u2069`;
const phoneInput = () => screen.getByLabelText('schedule.form.phone') as HTMLInputElement;
const chip = () => screen.getByRole('button', { name: 'phone.chip' });
const queryChip = () => screen.queryByRole('button', { name: 'phone.chip' });

const fillDetails = (phone: string) => {
  fireEvent.change(screen.getByLabelText('schedule.form.name'), { target: { value: 'Dana Levi' } });
  fireEvent.change(phoneInput(), { target: { value: phone } });
};
const submitDetails = () => fireEvent.submit(screen.getByLabelText('schedule.form.name').closest('form')!);

const otpBoxes = () => screen.queryAllByLabelText(/^schedule\.form\.otpDigit:/) as HTMLInputElement[];
const enterOtp = async (code = '123456') => {
  const boxes = await waitFor(() => {
    const found = otpBoxes();
    expect(found).toHaveLength(6);
    return found;
  });
  code.split('').forEach((digit, index) => fireEvent.change(boxes[index], { target: { value: digit } }));
};

/** The frame the page drew, once it has. */
const frame = async (): Promise<HTMLIFrameElement> =>
  waitFor(() => {
    const found = document.querySelector<HTMLIFrameElement>('[data-testid="code-frame"] iframe');
    expect(found).not.toBeNull();
    return found!;
  });

/** Everything the page posts to the frame from now on. */
const listenToFrame = async () => vi.spyOn((await frame()).contentWindow as Window, 'postMessage').mockImplementation(() => undefined);

/** The frame speaks: from lightor.app, from its own window. */
const say = async (data: unknown) => {
  const source = (await frame()).contentWindow;
  await act(async () => {
    window.dispatchEvent(new MessageEvent('message', { data, origin: ORIGIN, source }));
  });
};

const messages = (posted: { mock: { calls: unknown[][] } }, type: string) =>
  posted.mock.calls.filter(([message]) => (message as { type?: string }).type === type);

/** A US number in the details form, the send button tapped, the fake frame loaded and listening. */
const sendToUsNumber = async () => {
  fillDetails('0501234567');
  choose(chip(), 'US');
  fireEvent.change(phoneInput(), { target: { value: '2125550123' } });
  expect(phoneInput().value).toBe('(212) 555-0123');
  submitDetails();
  const posted = await listenToFrame();
  await say({ type: 'lt-code-ready' });
  return posted;
};

describe('booking with a number abroad (LT-677)', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
    resetVisitorPassForTests();
    resetPhoneCountriesForTests();
    mocks.handshake.mockResolvedValue(true);
    mocks.getCalendar.mockResolvedValue({ busy: [], classes: [] });
    mocks.sendOtp.mockResolvedValue({ ok: true });
    mocks.verifyOtp.mockResolvedValue('pt_1');
    mocks.exchangePhoneProof.mockResolvedValue({ ok: true, phoneToken: 'pt_abroad', phone: '+12125550123' });
    mocks.createAppointment.mockResolvedValue(booked('0501234567'));
  });

  afterEach(() => {
    resetPhoneCountriesForTests();
    vi.useRealTimers();
  });

  describe('while no country abroad is open', () => {
    it('is the form as it always was: no chip, the Israeli checks, the number as typed, no frame', async () => {
      renderWidget({ phone: '+12125550123' });
      await reachDetails();
      expect(queryChip()).toBeNull();
      expect(phoneInput().getAttribute('inputmode')).toBe('numeric');
      expect(phoneInput().getAttribute('pattern')).toBe('[0-9]*');
      expect(phoneInput().getAttribute('placeholder')).toBe('');
      expect(phoneInput().hasAttribute('dir')).toBe(false);

      // A US number, however it is written, is not taken.
      fillDetails('+1 (212) 555-0123');
      expect(phoneInput().value).toBe('1212555012');
      submitDetails();
      expect(await screen.findByText('schedule.validation.phone.start')).toBeTruthy();
      expect(mocks.sendOtp).not.toHaveBeenCalled();

      fillDetails('0501234567');
      submitDetails();
      await enterOtp();
      expect(await screen.findByText('schedule.success')).toBeTruthy();
      expect(mocks.sendOtp).toHaveBeenCalledTimes(1);
      expect(mocks.sendOtp).toHaveBeenCalledWith('0501234567', 'sms');
      expect(mocks.verifyOtp).toHaveBeenCalledWith('0501234567', '123456');
      expect(mocks.createAppointment.mock.calls[0][0]).toMatchObject({ phone: '0501234567', channelType: 'sms' });
      expect(mocks.createAppointment.mock.calls[0][1]).toBe('pt_1');
      expect(mocks.exchangePhoneProof).not.toHaveBeenCalled();
      expect(document.querySelector('iframe')).toBeNull();
    });
  });

  describe('with the US open', () => {
    beforeEach(() => resetPhoneCountriesForTests({ offered: ['IL', 'US'] }));

    it('an Israeli number still goes the road it always did, with the same values', async () => {
      renderWidget();
      await reachDetails();
      expect(chip()).toBeTruthy();
      fillDetails('0501234567');
      expect(screen.getByText('schedule.channel.sms')).toBeTruthy();
      submitDetails();
      await enterOtp();

      expect(await screen.findByText('schedule.success')).toBeTruthy();
      expect(mocks.sendOtp).toHaveBeenCalledTimes(1);
      expect(mocks.sendOtp).toHaveBeenCalledWith('0501234567', 'sms');
      expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
      expect(mocks.verifyOtp).toHaveBeenCalledWith('0501234567', '123456');
      expect(mocks.createAppointment.mock.calls[0][0]).toMatchObject({ phone: '0501234567', channelType: 'sms' });
      expect(mocks.createAppointment.mock.calls[0][1]).toBe('pt_1');
      expect(mocks.exchangePhoneProof).not.toHaveBeenCalled();
      // No frame was ever loaded for it.
      expect(document.querySelector('iframe')).toBeNull();
    });

    it('an Israeli number may still take its code on WhatsApp', async () => {
      renderWidget();
      await reachDetails();
      fillDetails('0501234567');
      fireEvent.click(screen.getByRole('switch', { name: 'schedule.channel.switch' }));
      expect(screen.getByText('schedule.channel.whatsapp')).toBeTruthy();
      submitDetails();
      await waitFor(() => expect(otpBoxes()).toHaveLength(6));
      expect(mocks.sendOtp).toHaveBeenCalledWith('0501234567', 'whatsapp');
    });

    it('a US number: the frame sends and checks the code, the API exchanges the proof, the booking carries E.164', async () => {
      mocks.createAppointment.mockResolvedValue(booked('+12125550123'));
      renderWidget();
      await reachDetails();
      // Nothing is loaded, and nothing asked, before the visitor's own tap.
      expect(document.querySelector('iframe')).toBeNull();

      fillDetails('0501234567');
      choose(chip(), 'US');
      fireEvent.change(phoneInput(), { target: { value: '2125550123' } });
      expect(document.querySelector('iframe')).toBeNull();
      submitDetails();

      const posted = await listenToFrame();
      expect(new URL((await frame()).src).searchParams.get('parent')).toBe(window.location.origin);
      expect(posted).not.toHaveBeenCalled();
      await say({ type: 'lt-code-ready' });
      expect(posted).toHaveBeenCalledTimes(1);
      expect(posted).toHaveBeenCalledWith({ type: 'lt-code-send', phone: '+12125550123', lang: 'en' }, ORIGIN);
      // Still on the details: the code has not gone out yet.
      expect(otpBoxes()).toHaveLength(0);

      await say({ type: 'lt-code-sent' });
      await enterOtp('654321');
      await waitFor(() => expect(messages(posted, 'lt-code-confirm')).toHaveLength(1));
      expect(posted).toHaveBeenLastCalledWith({ type: 'lt-code-confirm', code: '654321' }, ORIGIN);
      expect(mocks.exchangePhoneProof).not.toHaveBeenCalled();

      await say({ type: 'lt-code-verified', idToken: 'proof-1' });
      expect(await screen.findByText('schedule.success')).toBeTruthy();
      expect(mocks.exchangePhoneProof).toHaveBeenCalledTimes(1);
      expect(mocks.exchangePhoneProof).toHaveBeenCalledWith('proof-1');
      expect(mocks.createAppointment).toHaveBeenCalledTimes(1);
      expect(mocks.createAppointment.mock.calls[0][0]).toMatchObject({ name: 'Dana Levi', phone: '+12125550123', channelType: 'sms' });
      expect(mocks.createAppointment.mock.calls[0][1]).toBe('pt_abroad');
      // The Israeli routes never heard of this number.
      expect(mocks.sendOtp).not.toHaveBeenCalled();
      expect(mocks.verifyOtp).not.toHaveBeenCalled();
      // One code asked, one code checked.
      expect(messages(posted, 'lt-code-send')).toHaveLength(1);
      expect(messages(posted, 'lt-code-confirm')).toHaveLength(1);
    });

    it('a number pasted with +1 moves the chip by itself and books the same way', async () => {
      renderWidget();
      await reachDetails();
      fillDetails('+1 (212) 555-0123');
      expect(phoneInput().value).toBe('(212) 555-0123');
      expect(screen.getByTestId('phone-chip-face').textContent).toBe('+1');
      submitDetails();
      const posted = await listenToFrame();
      await say({ type: 'lt-code-ready' });
      expect(posted).toHaveBeenCalledWith({ type: 'lt-code-send', phone: '+12125550123', lang: 'en' }, ORIGIN);
      expect(mocks.sendOtp).not.toHaveBeenCalled();
    });

    it("starts on the site's own country: a US business's form reads a local number as American", async () => {
      renderWidget({ phone: '+15125550100' });
      await reachDetails();
      expect(screen.getByTestId('phone-chip-face').textContent).toBe('+1');
      expect(phoneInput().placeholder).toBe('(212) 555-0123');
      fillDetails('5125550199');
      expect(phoneInput().value).toBe('(512) 555-0199');
    });

    it('refuses a number that is not whole, and one of a country not on offer, before any code', async () => {
      renderWidget();
      await reachDetails();
      fillDetails('0501234567');
      choose(chip(), 'US');
      fireEvent.change(phoneInput(), { target: { value: '212555012' } });
      submitDetails();
      expect(await screen.findByText(`phone.validation.invalid:${example('(212) 555-0123')}`)).toBeTruthy();

      fireEvent.change(phoneInput(), { target: { value: '+44 7911 123456' } });
      submitDetails();
      expect(await screen.findByText('phone.validation.country')).toBeTruthy();
      expect(document.querySelector('iframe')).toBeNull();
      expect(mocks.sendOtp).not.toHaveBeenCalled();
    });

    it('keeps the WhatsApp choice for the messages that follow, and still sends the code by the frame', async () => {
      mocks.createAppointment.mockResolvedValue(booked('+12125550123'));
      renderWidget();
      await reachDetails();
      fillDetails('0501234567');
      choose(chip(), 'US');
      fireEvent.change(phoneInput(), { target: { value: '2125550123' } });
      // The switch says what it does for this number: updates, not the code.
      fireEvent.click(screen.getByRole('switch', { name: 'schedule.channel.switchAbroad' }));
      expect(screen.getByText('schedule.channel.whatsappAbroad')).toBeTruthy();
      expect(screen.queryByText('schedule.channel.whatsapp')).toBeNull();
      submitDetails();

      const posted = await listenToFrame();
      await say({ type: 'lt-code-ready' });
      expect(posted).toHaveBeenCalledWith({ type: 'lt-code-send', phone: '+12125550123', lang: 'en' }, ORIGIN);
      expect(mocks.sendOtp).not.toHaveBeenCalled();
      await say({ type: 'lt-code-sent' });
      await enterOtp();
      await waitFor(() => expect(messages(posted, 'lt-code-confirm')).toHaveLength(1));
      await say({ type: 'lt-code-verified', idToken: 'proof-1' });
      expect(await screen.findByText('schedule.success')).toBeTruthy();
      expect(mocks.createAppointment.mock.calls[0][0]).toMatchObject({ phone: '+12125550123', channelType: 'whatsapp' });
    });

    it('says so when the frame cannot send a code, stays on the details, and does not ask again by itself', async () => {
      renderWidget();
      await reachDetails();
      const posted = await sendToUsNumber();
      await say({ type: 'lt-code-error', stage: 'send', code: 'auth/captcha-check-failed' });
      expect(await screen.findByText('schedule.error.codeNotSent')).toBeTruthy();
      expect(otpBoxes()).toHaveLength(0);
      expect(screen.getByLabelText('schedule.form.name')).toBeTruthy();

      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
      expect(messages(posted, 'lt-code-send')).toHaveLength(1);

      // The visitor's next tap is a new request.
      submitDetails();
      await waitFor(() => expect(messages(posted, 'lt-code-send')).toHaveLength(2));
      await say({ type: 'lt-code-sent' });
      await waitFor(() => expect(otpBoxes()).toHaveLength(6));
    });

    it.each([
      ['auth/too-many-requests', 'schedule.error.tooManyCodes'],
      ['some/gate-refusal', 'schedule.error.codeNotSent'],
    ])('a send refused with %s reads %s', async (code, text) => {
      renderWidget();
      await reachDetails();
      await sendToUsNumber();
      await say({ type: 'lt-code-error', stage: 'send', code });
      expect(await screen.findByText(text)).toBeTruthy();
      expect(screen.queryByText('schedule.error.sendOtp')).toBeNull();
    });

    it('a number the frame itself refuses is said on the field', async () => {
      renderWidget();
      await reachDetails();
      await sendToUsNumber();
      await say({ type: 'lt-code-error', stage: 'send', code: 'auth/invalid-phone-number' });
      expect(await screen.findByText(`phone.validation.invalid:${example('(212) 555-0123')}`)).toBeTruthy();
      expect(phoneInput().getAttribute('aria-invalid')).toBe('true');
    });

    it('a wrong code is refused as an Israeli one is, and the next code typed is checked', async () => {
      mocks.createAppointment.mockResolvedValue(booked('+12125550123'));
      renderWidget();
      await reachDetails();
      const posted = await sendToUsNumber();
      await say({ type: 'lt-code-sent' });
      await enterOtp('000000');
      await waitFor(() => expect(messages(posted, 'lt-code-confirm')).toHaveLength(1));
      await say({ type: 'lt-code-error', stage: 'confirm', code: 'auth/invalid-verification-code' });

      expect(await screen.findByText('schedule.error.invalidOtp')).toBeTruthy();
      expect(mocks.exchangePhoneProof).not.toHaveBeenCalled();
      expect(mocks.createAppointment).not.toHaveBeenCalled();
      // The same wrong code is not sent again by itself.
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
      expect(messages(posted, 'lt-code-confirm')).toHaveLength(1);

      await enterOtp('123456');
      await waitFor(() => expect(messages(posted, 'lt-code-confirm')).toHaveLength(2));
      expect(posted).toHaveBeenLastCalledWith({ type: 'lt-code-confirm', code: '123456' }, ORIGIN);
      await say({ type: 'lt-code-verified', idToken: 'proof-2' });
      expect(await screen.findByText('schedule.success')).toBeTruthy();
      expect(mocks.exchangePhoneProof).toHaveBeenCalledWith('proof-2');
    });

    it.each([
      ['auth/code-expired', 'schedule.error.codeExpired'],
      ['lt/no-code-sent', 'schedule.error.codeExpired'],
      ['auth/too-many-requests', 'schedule.error.tooManyCodes'],
      ['auth/network-request-failed', 'schedule.genericError'],
    ])('a code refused with %s reads %s', async (code, text) => {
      renderWidget();
      await reachDetails();
      const posted = await sendToUsNumber();
      await say({ type: 'lt-code-sent' });
      await enterOtp();
      await waitFor(() => expect(messages(posted, 'lt-code-confirm')).toHaveLength(1));
      await say({ type: 'lt-code-error', stage: 'confirm', code });
      expect(await screen.findByText(text)).toBeTruthy();
      expect(mocks.createAppointment).not.toHaveBeenCalled();
    });

    it.each([
      [{ ok: false, status: 400, code: 'PHONE_PROOF_INVALID' }, 'schedule.error.phoneRefused'],
      [{ ok: false, status: 404 }, 'schedule.genericError'],
      [{ ok: false }, 'schedule.genericError'],
    ])("the server's refusal of the proof (%j) is shown, and nothing is booked", async (refusal, text) => {
      mocks.exchangePhoneProof.mockResolvedValue(refusal);
      renderWidget();
      await reachDetails();
      const posted = await sendToUsNumber();
      await say({ type: 'lt-code-sent' });
      await enterOtp();
      await waitFor(() => expect(messages(posted, 'lt-code-confirm')).toHaveLength(1));
      await say({ type: 'lt-code-verified', idToken: 'proof-1' });
      expect(await screen.findByText(text)).toBeTruthy();
      expect(mocks.exchangePhoneProof).toHaveBeenCalledTimes(1);
      expect(mocks.createAppointment).not.toHaveBeenCalled();
    });

    it('renews an expired visitor pass and exchanges the same proof once more', async () => {
      mocks.createAppointment.mockResolvedValue(booked('+12125550123'));
      mocks.exchangePhoneProof
        .mockResolvedValueOnce({ ok: false, status: 401 })
        .mockResolvedValueOnce({ ok: true, phoneToken: 'pt_abroad' });
      renderWidget();
      await reachDetails();
      const posted = await sendToUsNumber();
      await say({ type: 'lt-code-sent' });
      await enterOtp();
      await waitFor(() => expect(messages(posted, 'lt-code-confirm')).toHaveLength(1));
      await say({ type: 'lt-code-verified', idToken: 'proof-1' });

      expect(await screen.findByText('schedule.success')).toBeTruthy();
      expect(mocks.exchangePhoneProof.mock.calls).toEqual([['proof-1'], ['proof-1']]);
      // The code itself was checked once.
      expect(messages(posted, 'lt-code-confirm')).toHaveLength(1);
      expect(mocks.createAppointment.mock.calls[0][1]).toBe('pt_abroad');
    });

    it('keeps the resend cooldown for a number abroad: one more code only on a tap, thirty seconds later', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      renderWidget();
      await reachDetails();
      const posted = await sendToUsNumber();
      await say({ type: 'lt-code-sent' });
      await waitFor(() => expect(otpBoxes()).toHaveLength(6));

      const resend = () => screen.getByRole('button', { name: /schedule\.form\.resend/ }) as HTMLButtonElement;
      expect(resend().disabled).toBe(true);
      fireEvent.click(resend());
      await act(async () => { vi.advanceTimersByTime(29_000); });
      expect(resend().disabled).toBe(true);
      // Half a minute on, nothing was asked by itself.
      expect(messages(posted, 'lt-code-send')).toHaveLength(1);

      await act(async () => { vi.advanceTimersByTime(2_000); });
      await waitFor(() => expect(resend().disabled).toBe(false));
      expect(messages(posted, 'lt-code-send')).toHaveLength(1);

      fireEvent.click(resend());
      await waitFor(() => expect(messages(posted, 'lt-code-send')).toHaveLength(2));
      expect(posted).toHaveBeenLastCalledWith({ type: 'lt-code-send', phone: '+12125550123', lang: 'en' }, ORIGIN);
      // And the cooldown starts over.
      expect(resend().disabled).toBe(true);
      expect(mocks.sendOtp).not.toHaveBeenCalled();
    });

    it("shows the frame only while Google's check needs the visitor", async () => {
      renderWidget();
      await reachDetails();
      await sendToUsNumber();
      expect(screen.getByTestId('code-frame').dataset.shown).toBe('false');
      expect(screen.queryByRole('dialog')).toBeNull();
      await say({ type: 'lt-code-attention', on: true });
      expect(screen.getByRole('dialog', { name: 'phone.check.title' })).toBeTruthy();
      await say({ type: 'lt-code-attention', on: false });
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('takes the frame away with the form', async () => {
      const { unmount } = renderWidget();
      await reachDetails();
      await sendToUsNumber();
      expect(document.querySelectorAll('iframe')).toHaveLength(1);
      unmount();
      expect(document.querySelector('iframe')).toBeNull();
    });
  });

  describe('moving a booking made with a number abroad', () => {
    const held = booked('+12125550123');

    it('shows the number under its own chip, even before the API names the country, and sends its code by the frame', async () => {
      mocks.updateAppointment.mockResolvedValue(held);
      renderWidget({ isUpdating: true, appointmentToUpdate: held, onUpdateComplete: vi.fn() });
      await reachDetails({ service: null });

      expect(phoneInput().value).toBe('(212) 555-0123');
      expect(screen.getByTestId('phone-chip-face').textContent).toBe('+1');
      submitDetails();
      const posted = await listenToFrame();
      await say({ type: 'lt-code-ready' });
      expect(posted).toHaveBeenCalledWith({ type: 'lt-code-send', phone: '+12125550123', lang: 'en' }, ORIGIN);
      expect(mocks.sendOtp).not.toHaveBeenCalled();

      await say({ type: 'lt-code-sent' });
      await enterOtp();
      await waitFor(() => expect(messages(posted, 'lt-code-confirm')).toHaveLength(1));
      await say({ type: 'lt-code-verified', idToken: 'proof-1' });
      await waitFor(() => expect(mocks.updateAppointment).toHaveBeenCalledTimes(1));
      expect(mocks.updateAppointment.mock.calls[0][0]).toMatchObject({ _id: 'a1', phone: '+12125550123' });
    });

    it('an Israeli booking moves as it always did: the number as stored, the API\'s own code', async () => {
      const israeli = booked('0501234567');
      mocks.updateAppointment.mockResolvedValue(israeli);
      renderWidget({ isUpdating: true, appointmentToUpdate: israeli, onUpdateComplete: vi.fn() });
      await reachDetails({ service: null });
      expect(phoneInput().value).toBe('0501234567');
      expect(queryChip()).toBeNull();
      submitDetails();
      await enterOtp();
      await waitFor(() => expect(mocks.updateAppointment).toHaveBeenCalledTimes(1));
      expect(mocks.sendOtp).toHaveBeenCalledWith('0501234567', 'sms');
      expect(mocks.verifyOtp).toHaveBeenCalledWith('0501234567', '123456');
      expect(mocks.updateAppointment.mock.calls[0][0]).toMatchObject({ phone: '0501234567' });
      expect(document.querySelector('iframe')).toBeNull();
    });
  });
});

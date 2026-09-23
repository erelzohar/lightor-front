import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Schedule from '../../components/Layout/Schedule/Schedule';
import ManageAppointment from '../../components/ManageAppointment';
import { Appointment } from '../../models/Appointment';
import { AppointmentType } from '../../models/AppointmentType';
import { BookingField, fieldsForService, answersForRequest, answerProblem } from '../../models/BookingField';
import { ScheduleConfig } from '../../models/ScheduleConfig';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

const DAY = 86_400_000;

// Referenced inside the mock factories below, so hoisted above them.
const mocks = vi.hoisted(() => ({
  getCalendar: vi.fn(),
  createAppointment: vi.fn(),
  getAppointmentById: vi.fn(),
  getWebConfig: vi.fn(),
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
  loadPlaces: vi.fn(),
  fetchSuggestions: vi.fn(),
  resolveSuggestion: vi.fn(),
}));

// jsdom has no IntersectionObserver, and framer-motion's whileInView reaches
// for it during mount — without this the widget never renders at all.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
vi.stubGlobal('IntersectionObserver', NoopObserver);
Element.prototype.scrollIntoView = vi.fn();

// The Turnstile gate is not what this test is about: the stub passes the
// challenge as soon as it mounts.
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
  default: {
    getInstance: () => ({
      getCalendar: mocks.getCalendar,
      getAvailability: vi.fn().mockResolvedValue([]),
      createAppointment: mocks.createAppointment,
      getAppointmentById: mocks.getAppointmentById,
      updateAppointment: vi.fn(),
    }),
  },
}));
vi.mock('../../services/SmsService', () => ({ default: { sendOtp: mocks.sendOtp, verifyOtp: mocks.verifyOtp } }));
vi.mock('../../services/WebConfigService', () => ({ default: { getInstance: () => ({ getWebConfig: mocks.getWebConfig }) } }));
// Google's suggestions (LT-191) are mocked at the one module that talks to
// Google; placesKey stays real, so vi.stubEnv decides whether the widget is on.
vi.mock('../../services/places', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/places')>()),
  loadPlaces: mocks.loadPlaces,
  fetchAddressSuggestions: mocks.fetchSuggestions,
  resolveAddressSuggestion: mocks.resolveSuggestion,
}));
vi.mock('../../hooks/useTheme', () => ({ useTheme: () => {} }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useParams: () => ({ 'appointment-id': 'a1' }),
  useNavigate: () => vi.fn(),
}));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

const haircut = new AppointmentType('t1', 'Haircut', '80', 'u1', '1800000');
const massage = new AppointmentType('t2', 'Massage', '200', 'u1', '3600000');
const openAllWeek = Array(7).fill('08:00-20:00') as (string | null)[];

const field = (json: Record<string, unknown>): BookingField => BookingField.fromJSON(json)!;

/** A home-visit salon: an address for everyone, a room only for haircuts, a car only for massages. */
const catalog: BookingField[] = [
  field({ key: 'address', label: 'Address', type: 'address', required: true, services: [] }),
  field({ key: 'parking', label: 'Parking available', type: 'confirm', required: false, services: [] }),
  field({ key: 'room', label: 'Room', type: 'choice', required: false, options: ['Front', 'Back'], services: ['t1'] }),
  field({ key: 'car', label: 'Car model', type: 'text', required: true, services: ['t2'] }),
];

const renderWidget = () =>
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
      appointmentTypes={[haircut, massage]}
      bookingFields={catalog}
      header={{ style: 'centered' } as never}
      headerScale={'default' as never}
    />
  );

/** Calendar day buttons only — time buttons start with a digit. */
const dayButtons = (): HTMLElement[] =>
  screen.getAllByRole('button').filter((button) => {
    const label = button.getAttribute('aria-label') ?? '';
    return label.includes(' - ') && !/^\d/.test(label);
  });

/** Service, first open day, first free time: the details step. */
const reachDetails = async () => {
  fireEvent.click(await screen.findByText('Haircut'));
  await waitFor(() => expect(screen.getByText('schedule.legend.available')).toBeTruthy());
  fireEvent.click(dayButtons().find((button) => !button.hasAttribute('disabled'))!);
  const slots = await screen.findAllByRole('button', { name: /^\d{2}:\d{2}$/ });
  fireEvent.click(slots[0]);
  await waitFor(() => expect(screen.getByLabelText('schedule.form.name')).toBeTruthy());
};

const fillBasics = () => {
  fireEvent.change(screen.getByLabelText('schedule.form.name'), { target: { value: 'Dana Levi' } });
  fireEvent.change(screen.getByLabelText('schedule.form.phone'), { target: { value: '0501234567' } });
};

const detailsForm = (): HTMLFormElement => screen.getByLabelText('schedule.form.name').closest('form')!;
const sendCodeButton = (): HTMLElement => screen.getByRole('button', { name: 'schedule.form.send.code' });

/** Type the six digits; the widget submits on the sixth by itself. */
const enterOtp = async () => {
  const boxes = await waitFor(() => {
    const found = screen.getAllByRole('textbox').filter((input) => input.getAttribute('maxlength') === '1');
    expect(found).toHaveLength(6);
    return found;
  });
  boxes.forEach((box, index) => fireEvent.change(box, { target: { value: String(index + 1) } }));
};

const booked = Appointment.fromJSON({
  _id: 'a1', user_id: 'u1', type: { _id: 't1', name: 'Haircut', durationMS: '1800000' },
  name: 'Dana Levi', status: 'scheduled', phone: '0501234567', timestamp: '0', channelType: 'sms',
});

describe('the scope helper (LT-178)', () => {
  it('keeps the unscoped questions and those naming the service, in catalog order', () => {
    expect(fieldsForService(catalog, 't1').map((f) => f.key)).toEqual(['address', 'parking', 'room']);
    expect(fieldsForService(catalog, 't2').map((f) => f.key)).toEqual(['address', 'parking', 'car']);
    expect(fieldsForService(catalog, undefined).map((f) => f.key)).toEqual(['address', 'parking']);
  });

  it('refuses a choice outside the options and a value over its cap', () => {
    const room = catalog[2];
    expect(answerProblem(room, 'Side')).toBe('invalid');
    expect(answerProblem(room, 'Back')).toBeNull();
    expect(answerProblem(catalog[0], 'x'.repeat(201))).toBe('invalid');
    expect(answerProblem(catalog[0], '')).toBe('required');
    expect(answerProblem(catalog[1], undefined)).toBeNull();
  });

  it('builds the request from the scoped questions only, skipping what was left empty', () => {
    const answers = { address: ' Herzl 12, Tel Aviv ', parking: false, room: '', car: 'Mazda' };
    expect(answersForRequest(fieldsForService(catalog, 't1'), answers)).toEqual([
      { key: 'address', value: 'Herzl 12, Tel Aviv' },
    ]);
  });
});

describe('the models (LT-178)', () => {
  it('reads the catalog off the config and defaults to none', () => {
    const json = catalog.map((f) => ({ ...f }));
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, bookingFields: json }).bookingFields.map((f) => f.key))
      .toEqual(['address', 'parking', 'room', 'car']);
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE }).bookingFields).toEqual([]);
    // A malformed entry is no question rather than a broken site.
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, bookingFields: [{ label: 'x', type: 'bogus' }] }).bookingFields).toEqual([]);
  });

  it('keeps the answers on the appointment so a cancel sends them back whole', () => {
    const appointment = Appointment.fromJSON({
      ...booked, type: { ...booked.type },
      answers: [{ key: 'address', label: 'Address', value: 'Herzl 12, Tel Aviv' }],
    });
    // ManageAppointment#handleCancel spreads the appointment into the update.
    expect({ ...appointment, status: 'cancelled' }.answers).toEqual([{ key: 'address', label: 'Address', value: 'Herzl 12, Tel Aviv' }]);
    expect(Appointment.fromJSON({ ...booked, type: { ...booked.type } }).answers).toEqual([]);
  });
});

describe("the owner's questions on the booking form (LT-178)", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
    mocks.getCalendar.mockResolvedValue({ busy: [], classes: [] });
    mocks.sendOtp.mockResolvedValue(true);
    mocks.verifyOtp.mockResolvedValue('pt_1');
    mocks.createAppointment.mockResolvedValue(booked);
  });

  it('asks the questions for the chosen service and not those of another', async () => {
    renderWidget();
    await reachDetails();

    expect(screen.getByLabelText('Address')).toBeTruthy();
    expect(screen.getByLabelText(/^Parking available/)).toBeTruthy();
    expect(screen.getByLabelText(/^Room/)).toBeTruthy();
    // The owner's options, raw.
    expect(screen.getByRole('option', { name: 'Back' })).toBeTruthy();
    // Scoped to massages only.
    expect(screen.queryByText(/Car model/)).toBeNull();
  });

  it('refuses to send the code while a required answer is missing', async () => {
    renderWidget();
    await reachDetails();
    fillBasics();

    expect(sendCodeButton().hasAttribute('disabled')).toBe(true);

    fireEvent.submit(detailsForm());

    expect(await screen.findByText('schedule.validation.answer.required')).toBeTruthy();
    expect(mocks.sendOtp).not.toHaveBeenCalled();
  });

  it('sends the answers as key and value only, and an address keeps its digits and commas', async () => {
    renderWidget();
    await reachDetails();
    fillBasics();
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: 'Herzl 12, Tel Aviv' } });
    fireEvent.click(screen.getByLabelText(/^Parking available/));
    fireEvent.change(screen.getByLabelText(/^Room/), { target: { value: 'Back' } });
    expect(sendCodeButton().hasAttribute('disabled')).toBe(false);

    fireEvent.submit(detailsForm());
    await waitFor(() => expect(mocks.sendOtp).toHaveBeenCalledWith('0501234567', 'sms'));
    await enterOtp();

    await waitFor(() => expect(mocks.createAppointment).toHaveBeenCalledTimes(1));
    const [payload, token] = mocks.createAppointment.mock.calls[0];
    expect(token).toBe('pt_1');
    expect(payload.name).toBe('Dana Levi');
    expect(payload.answers).toEqual([
      { key: 'address', value: 'Herzl 12, Tel Aviv' },
      { key: 'parking', value: 'yes' },
      { key: 'room', value: 'Back' },
    ]);
  });

  it('leaves out an empty optional answer and an unticked confirm', async () => {
    renderWidget();
    await reachDetails();
    fillBasics();
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: 'Herzl 12, Tel Aviv' } });

    fireEvent.submit(detailsForm());
    await enterOtp();

    await waitFor(() => expect(mocks.createAppointment).toHaveBeenCalledTimes(1));
    expect(mocks.createAppointment.mock.calls[0][0].answers).toEqual([{ key: 'address', value: 'Herzl 12, Tel Aviv' }]);
  });

  it('returns to the question the server refused, with the message on it', async () => {
    mocks.createAppointment.mockRejectedValueOnce(
      Object.assign(new Error('ANSWER_INVALID'), { code: 'ANSWER_INVALID', details: { key: 'address', label: 'Address' } })
    );
    renderWidget();
    await reachDetails();
    fillBasics();
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: 'Herzl 12, Tel Aviv' } });

    fireEvent.submit(detailsForm());
    await enterOtp();
    await waitFor(() => expect(mocks.createAppointment).toHaveBeenCalledTimes(1));

    // Back on the details step: what was typed is still there, the message sits under it.
    const address = await screen.findByLabelText('Address');
    expect((address as HTMLInputElement).value).toBe('Herzl 12, Tel Aviv');
    expect(screen.getByText('schedule.validation.answer.invalid')).toBeTruthy();
    expect(screen.queryByText('schedule.genericError')).toBeNull();
  });
});

describe('the manage page (LT-178)', () => {
  const stored = (answers: unknown[]) =>
    Appointment.fromJSON({
      _id: 'a1', user_id: 'u1', type: { _id: 't1', name: 'Haircut', price: '80', user_id: 'u1', durationMS: '1800000' },
      name: 'Dana Levi', status: 'scheduled', phone: '0501234567', timestamp: String(Date.now() + 3 * DAY), channelType: 'sms',
      answers,
    });
  const site = {
    minCancelTimeMS: 0, businessName: 'Salon', logoImageName: '', contact: { phone: '' },
    workingDays: openAllWeek, vacations: [], dateOverrides: [], appointmentTypes: [haircut], bookingFields: catalog,
  };

  beforeEach(() => {
    mocks.getAppointmentById.mockReset();
    mocks.getWebConfig.mockReset();
    mocks.getWebConfig.mockResolvedValue(site);
  });

  it('lists the answers, a confirm as a tick and its label', async () => {
    mocks.getAppointmentById.mockResolvedValue(stored([
      { key: 'address', label: 'Address', value: 'Herzl 12, Tel Aviv' },
      { key: 'parking', label: 'Parking available', value: 'yes' },
    ]));

    render(<ManageAppointment />);

    expect(await screen.findByText('manage.label.answers')).toBeTruthy();
    expect(screen.getByText('Herzl 12, Tel Aviv')).toBeTruthy();
    expect(screen.getByText('Parking available')).toBeTruthy();
    expect(screen.queryByText('yes')).toBeNull();
  });

  it('shows no such section for a booking without answers', async () => {
    mocks.getAppointmentById.mockResolvedValue(stored([]));

    render(<ManageAppointment />);

    expect(await screen.findByText('manage.label.name')).toBeTruthy();
    expect(screen.queryByText('manage.label.answers')).toBeNull();
  });
});

describe('the address question with Google suggestions (LT-191)', () => {
  const herzl = { placeId: 'p1', text: 'Herzl 12, Tel Aviv-Yafo, Israel', mainText: 'Herzl 12', secondaryText: 'Tel Aviv-Yafo, Israel' };
  // Place Details answers only the id and coordinates; the text stays the line the customer chose (LT-192).
  const resolved = { placeId: 'p1', lat: 32.0624, lng: 34.7702 };
  const chosen = { key: 'address', value: 'Herzl 12, Tel Aviv-Yafo, Israel', placeId: 'p1', lat: 32.0624, lng: 34.7702 };

  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
    mocks.getCalendar.mockResolvedValue({ busy: [], classes: [] });
    mocks.sendOtp.mockResolvedValue(true);
    mocks.verifyOtp.mockResolvedValue('pt_1');
    mocks.createAppointment.mockResolvedValue(booked);
    mocks.loadPlaces.mockResolvedValue(undefined);
    mocks.fetchSuggestions.mockResolvedValue([herzl]);
    mocks.resolveSuggestion.mockResolvedValue(resolved);
    vi.stubEnv('VITE_GOOGLE_MAPS_KEY', 'test');
  });
  afterEach(() => vi.unstubAllEnvs());

  const addressInput = (): HTMLInputElement => screen.getByLabelText('Address') as HTMLInputElement;
  const typeAddress = (text: string) => fireEvent.change(addressInput(), { target: { value: text } });
  /** The details step with name and phone filled and the script loaded. */
  const reachAddress = async () => {
    renderWidget();
    await reachDetails();
    fillBasics();
    await waitFor(() => expect(addressInput().getAttribute('role')).toBe('combobox'));
  };
  /** Send the code, enter it, and return the answers the booking carried. */
  const bookAndReadAnswers = async () => {
    fireEvent.submit(detailsForm());
    await waitFor(() => expect(mocks.sendOtp).toHaveBeenCalledTimes(1));
    await enterOtp();
    await waitFor(() => expect(mocks.createAppointment).toHaveBeenCalledTimes(1));
    return mocks.createAppointment.mock.calls[0][0].answers;
  };

  it('judges a chosen address as fine and a typed one as unchosen only while suggestions are live', () => {
    const address = catalog[0];
    const place = { text: 'Herzl St 12, Tel Aviv-Yafo, Israel', placeId: 'p1', lat: 32.0624, lng: 34.7702 };
    expect(answerProblem(address, 'Herzl 12', { chooseAddress: true })).toBe('chooseAddress');
    expect(answerProblem(address, 'Herzl 12')).toBeNull();
    expect(answerProblem(address, 'Herzl 12', { chooseAddress: false })).toBeNull();
    expect(answerProblem(address, place, { chooseAddress: true })).toBeNull();
    expect(answerProblem(address, '', { chooseAddress: true })).toBe('required');
    expect(answerProblem(address, { ...place, text: 'x'.repeat(201) }, { chooseAddress: true })).toBe('invalid');
    // The other shapes are untouched by the rule.
    expect(answerProblem(catalog[3], 'Mazda', { chooseAddress: true })).toBeNull();
    expect(answersForRequest([address], { address: place })).toEqual([chosen]);
    expect(answersForRequest([address], { address: 'Herzl 12' })).toEqual([{ key: 'address', value: 'Herzl 12' }]);
    expect(answersForRequest([address], { address: { ...place, text: '  ' } })).toEqual([]);
  });

  it('keeps the place on a stored answer and drops anything else', () => {
    const appointment = Appointment.fromJSON({
      ...booked, type: { ...booked.type },
      answers: [
        { key: 'address', label: 'Address', value: 'Herzl St 12', placeId: 'p1', lat: 32.0624, lng: 34.7702, extra: 1 },
        { key: 'other', label: 'Other', value: 'typed', placeId: 'p2', lat: 'no' },
      ],
    });
    expect(appointment.answers).toEqual([
      { key: 'address', label: 'Address', value: 'Herzl St 12', placeId: 'p1', lat: 32.0624, lng: 34.7702 },
      { key: 'other', label: 'Other', value: 'typed' },
    ]);
  });

  it('is the plain input, never loading the script, without a key', async () => {
    vi.unstubAllEnvs();
    renderWidget();
    await reachDetails();
    fillBasics();
    typeAddress('Herzl 12, Tel Aviv');

    expect(addressInput().getAttribute('role')).toBeNull();
    expect(addressInput().getAttribute('autocomplete')).toBe('street-address');
    expect(mocks.loadPlaces).not.toHaveBeenCalled();
    const answers = await bookAndReadAnswers();
    expect(answers).toEqual([{ key: 'address', value: 'Herzl 12, Tel Aviv' }]);
    expect(mocks.fetchSuggestions).not.toHaveBeenCalled();
  });

  it('lists the suggestions from the third character, and a tap sends the chosen place with the address', async () => {
    await reachAddress();
    typeAddress('He');
    typeAddress('Her');

    const option = await screen.findByRole('option', { name: /Herzl 12/ });
    expect(mocks.fetchSuggestions).toHaveBeenCalledTimes(1);
    expect(mocks.fetchSuggestions).toHaveBeenCalledWith('Her', expect.objectContaining({ language: 'en' }));
    expect(screen.getByText('Tel Aviv-Yafo, Israel')).toBeTruthy();
    expect(screen.getByText('Google Maps')).toBeTruthy();
    expect(addressInput().getAttribute('aria-expanded')).toBe('true');
    expect(addressInput().getAttribute('aria-controls')).toBe('schedule-answer-address-listbox');

    fireEvent.click(option);
    await waitFor(() => expect(addressInput().value).toBe('Herzl 12, Tel Aviv-Yafo, Israel'));
    expect(mocks.resolveSuggestion).toHaveBeenCalledWith(expect.objectContaining({ placeId: 'p1' }));
    expect(screen.queryByRole('listbox')).toBeNull();

    const answers = await bookAndReadAnswers();
    expect(answers).toEqual([chosen]);
  });

  it('refuses an address that was typed but not chosen, before any code is sent', async () => {
    await reachAddress();
    typeAddress('Herzl 12, Tel Aviv');
    await screen.findByRole('option', { name: /Herzl 12/ });
    expect(sendCodeButton().hasAttribute('disabled')).toBe(false);

    fireEvent.submit(detailsForm());

    expect(await screen.findByText('schedule.validation.answer.chooseAddress')).toBeTruthy();
    expect(mocks.sendOtp).not.toHaveBeenCalled();
  });

  it('drops back to typed text once a chosen address is edited, and asks again', async () => {
    await reachAddress();
    typeAddress('Her');
    fireEvent.click(await screen.findByRole('option', { name: /Herzl 12/ }));
    await waitFor(() => expect(addressInput().value).toBe('Herzl 12, Tel Aviv-Yafo, Israel'));

    typeAddress('Herzl St 12, Tel Aviv-Yafo, Israel, apt 3');
    fireEvent.submit(detailsForm());

    expect(await screen.findByText('schedule.validation.answer.chooseAddress')).toBeTruthy();
    expect(mocks.sendOtp).not.toHaveBeenCalled();
  });

  it('chooses with the keyboard: ArrowDown, then Enter', async () => {
    await reachAddress();
    typeAddress('Her');
    const option = await screen.findByRole('option', { name: /Herzl 12/ });

    fireEvent.keyDown(addressInput(), { key: 'ArrowDown' });
    expect(addressInput().getAttribute('aria-activedescendant')).toBe('schedule-answer-address-option-0');
    expect(option.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(addressInput(), { key: 'Enter' });
    await waitFor(() => expect(addressInput().value).toBe('Herzl 12, Tel Aviv-Yafo, Israel'));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(mocks.sendOtp).not.toHaveBeenCalled();
  });

  it('says so when Google has no match, and Escape closes the list', async () => {
    mocks.fetchSuggestions.mockResolvedValue([]);
    await reachAddress();
    typeAddress('Zzz');

    expect(await screen.findByText('schedule.form.answer.noAddresses')).toBeTruthy();
    fireEvent.keyDown(addressInput(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(addressInput().getAttribute('aria-expanded')).toBe('false');
  });

  it('is the plain input when the script fails to load: typed text is accepted and sent as text', async () => {
    mocks.loadPlaces.mockRejectedValue(new Error('blocked'));
    renderWidget();
    await reachDetails();
    fillBasics();
    await waitFor(() => expect(mocks.loadPlaces).toHaveBeenCalledTimes(1));
    typeAddress('Herzl 12, Tel Aviv');

    expect(addressInput().getAttribute('role')).toBeNull();
    const answers = await bookAndReadAnswers();
    expect(answers).toEqual([{ key: 'address', value: 'Herzl 12, Tel Aviv' }]);
    expect(mocks.fetchSuggestions).not.toHaveBeenCalled();
    expect(screen.queryByText('schedule.validation.answer.chooseAddress')).toBeNull();
  });

  it('is the plain input again when Google refuses a request', async () => {
    mocks.fetchSuggestions.mockRejectedValue(new Error('REQUEST_DENIED'));
    await reachAddress();
    typeAddress('Herzl 12, Tel Aviv');

    await waitFor(() => expect(mocks.fetchSuggestions).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(addressInput().getAttribute('role')).toBeNull());
    expect(screen.queryByRole('listbox')).toBeNull();
    const answers = await bookAndReadAnswers();
    expect(answers).toEqual([{ key: 'address', value: 'Herzl 12, Tel Aviv' }]);
  });

  it('the manage page still shows the text of a chosen address', async () => {
    mocks.getWebConfig.mockResolvedValue({
      minCancelTimeMS: 0, businessName: 'Salon', logoImageName: '', contact: { phone: '' },
      workingDays: openAllWeek, vacations: [], dateOverrides: [], appointmentTypes: [haircut], bookingFields: catalog,
    });
    mocks.getAppointmentById.mockResolvedValue(Appointment.fromJSON({
      _id: 'a1', user_id: 'u1', type: { _id: 't1', name: 'Haircut', price: '80', user_id: 'u1', durationMS: '1800000' },
      name: 'Dana Levi', status: 'scheduled', phone: '0501234567', timestamp: String(Date.now() + 3 * DAY), channelType: 'sms',
      answers: [{ key: 'address', label: 'Address', value: 'Herzl St 12, Tel Aviv-Yafo, Israel', placeId: 'p1', lat: 32.0624, lng: 34.7702 }],
    }));

    render(<ManageAppointment />);

    expect(await screen.findByText('manage.label.answers')).toBeTruthy();
    expect(screen.getByText('Herzl St 12, Tel Aviv-Yafo, Israel')).toBeTruthy();
  });
});

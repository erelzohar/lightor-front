import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Contact from '../../components/Layout/Contact';
import { ContactConfig } from '../../models/ContactConfig';
import { BookingField } from '../../models/BookingField';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';
import { resetVisitorPassForTests } from '../../services/visitorPass';

/**
 * LT-197 — the contact form is lead capture: the owner's own questions under
 * name and phone, an optional message, the server's refusals landing on the
 * named question, and call / WhatsApp buttons instead of a form once the
 * month's leads are used up.
 */

const mocks = vi.hoisted(() => ({
  sendContactMessage: vi.fn(),
  handshake: vi.fn(),
  loadPlaces: vi.fn(),
  fetchSuggestions: vi.fn(),
  resolveSuggestion: vi.fn(),
}));

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
vi.stubGlobal('IntersectionObserver', NoopObserver);
Element.prototype.scrollIntoView = vi.fn();

vi.mock('../../services/SmsService', () => ({ default: { sendContactMessage: mocks.sendContactMessage } }));
// The visitor check (LT-199): the widget passes as soon as it mounts; the
// handshake it feeds is the real store's, against a mocked server call.
vi.mock('@marsidev/react-turnstile', async () => {
  const React = await import('react');
  return {
    Turnstile: ({ onSuccess }: { onSuccess?: (token: string) => void }): null => {
      React.useEffect(() => { onSuccess?.('test-token'); }, []);
      return null;
    },
  };
});
vi.mock('../../services/AuthService', () => ({ default: { handshake: mocks.handshake } }));
vi.mock('../../services/places', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/places')>()),
  loadPlaces: mocks.loadPlaces,
  fetchAddressSuggestions: mocks.fetchSuggestions,
  resolveAddressSuggestion: mocks.resolveSuggestion,
}));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

const field = (json: Record<string, unknown>): BookingField => BookingField.fromJSON(json)!;

const leadFields: BookingField[] = [
  field({ key: 'project', label: 'Project', type: 'choice', required: true, options: ['Kitchen', 'Bath'] }),
  field({ key: 'address', label: 'Address', type: 'address', required: false }),
];

const renderForm = (props: { leadFields?: BookingField[]; leadsOpen?: boolean } = {}) =>
  render(
    <Contact
      config={new ContactConfig(true, 'Contact', '')}
      contact={{ phone: '050-1234567', mail: 'shop@example.com' }}
      workingDays={Array(7).fill(null)}
      layout="editorial"
      leadFields={props.leadFields ?? leadFields}
      leadsOpen={props.leadsOpen}
    />
  );

const fillBasics = () => {
  fireEvent.change(screen.getByLabelText('contact.form.name'), { target: { value: 'Dana' } });
  fireEvent.change(screen.getByLabelText('contact.form.phone'), { target: { value: '0501234567' } });
};
const form = (): HTMLFormElement => document.querySelector('form') as HTMLFormElement;
const sentPayload = () => mocks.sendContactMessage.mock.calls[0][1];

describe('lead form (LT-197)', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
    mocks.sendContactMessage.mockResolvedValue({ ok: true });
    mocks.handshake.mockResolvedValue(true);
    resetVisitorPassForTests();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("renders the owner's questions and refuses a missing required answer before sending", async () => {
    renderForm();
    expect(screen.getByLabelText('Project')).toBeTruthy();
    expect(screen.getByLabelText(/^Address/)).toBeTruthy();

    fillBasics();
    fireEvent.submit(form());

    expect(await screen.findByText('schedule.validation.answer.required')).toBeTruthy();
    expect(mocks.sendContactMessage).not.toHaveBeenCalled();
  });

  it('sends with an empty message, carrying the answers and no message key', async () => {
    renderForm();
    fillBasics();
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'Bath' } });
    fireEvent.submit(form());

    await waitFor(() => expect(mocks.sendContactMessage).toHaveBeenCalledTimes(1));
    expect(sentPayload()).toEqual({ name: 'Dana', phone: '0501234567', answers: [{ key: 'project', value: 'Bath' }] });
    expect(await screen.findByText('contact.form.success')).toBeTruthy();
  });

  it("carries an address chosen from Google's suggestions with its place", async () => {
    mocks.loadPlaces.mockResolvedValue(undefined);
    mocks.fetchSuggestions.mockResolvedValue([
      { placeId: 'p1', text: 'Herzl 12, Haifa, Israel', mainText: 'Herzl 12', secondaryText: 'Haifa, Israel' },
    ]);
    mocks.resolveSuggestion.mockResolvedValue({ placeId: 'p1', lat: 32.8, lng: 35 });
    vi.stubEnv('VITE_GOOGLE_MAPS_KEY', 'test');

    renderForm();
    fillBasics();
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'Kitchen' } });
    const address = screen.getByLabelText(/^Address/) as HTMLInputElement;
    await waitFor(() => expect(address.getAttribute('role')).toBe('combobox'));
    fireEvent.change(address, { target: { value: 'Herz' } });
    fireEvent.click(await screen.findByRole('option', { name: /Herzl 12/ }));
    await waitFor(() => expect(address.value).toBe('Herzl 12, Haifa, Israel'));
    await waitFor(() => expect(mocks.resolveSuggestion).toHaveBeenCalled());

    fireEvent.submit(form());
    await waitFor(() => expect(mocks.sendContactMessage).toHaveBeenCalledTimes(1));
    expect(sentPayload().answers).toEqual([
      { key: 'project', value: 'Kitchen' },
      { key: 'address', value: 'Herzl 12, Haifa, Israel', placeId: 'p1', lat: 32.8, lng: 35 },
    ]);
  });

  it('puts a server refusal on the question it names', async () => {
    mocks.sendContactMessage.mockResolvedValue({ ok: false, code: 'ANSWER_INVALID', details: { key: 'project', label: 'Project' } });
    renderForm();
    fillBasics();
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'Bath' } });
    fireEvent.submit(form());

    const message = await screen.findByText('schedule.validation.answer.invalid');
    // The message sits inside the Project question's own block.
    expect(message.closest('div')?.querySelector('#contact-answer-project')).toBeTruthy();
    expect(screen.queryByText('contact.form.success')).toBeNull();
  });

  it('shows call and WhatsApp buttons and no form when leads are closed', () => {
    renderForm({ leadsOpen: false });
    expect(document.querySelector('form')).toBeNull();
    expect(screen.getByTestId('contact-closed')).toBeTruthy();
    expect(screen.getByText('contact.closed')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'contact.option.call' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'contact.option.whatsapp' })).toBeTruthy();
  });

  it('switches to the buttons when the server says the month is full', async () => {
    mocks.sendContactMessage.mockResolvedValue({ ok: false, code: 'LEADS_CAP_REACHED' });
    renderForm({ leadFields: [] });
    fillBasics();
    fireEvent.submit(form());

    expect(await screen.findByTestId('contact-closed')).toBeTruthy();
    expect(document.querySelector('form')).toBeNull();
  });

  it('a generic failure says so and keeps the form', async () => {
    mocks.sendContactMessage.mockResolvedValue({ ok: false });
    renderForm({ leadFields: [] });
    fillBasics();
    fireEvent.submit(form());

    expect(await screen.findByText('schedule.genericError')).toBeTruthy();
    expect(document.querySelector('form')).toBeTruthy();
  });
});

describe('WebsiteConfig leads (LT-197)', () => {
  it('parses leadFields and reads an absent leadsOpen as open', () => {
    const parsed = WebsiteConfig.fromJSON({
      ...RAW_AI_RESPONSE_SHAPE,
      leadFields: [{ key: 'project', label: 'Project', type: 'text', required: true, services: [] }, { bogus: true }],
    });
    expect(parsed.leadFields.map((f) => f.key)).toEqual(['project']);
    expect(parsed.leadsOpen).toBe(true);
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, leadsOpen: false }).leadsOpen).toBe(false);
  });
});

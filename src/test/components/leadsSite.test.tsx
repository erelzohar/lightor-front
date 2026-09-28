import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ComposedPage from '../../components/blocks/ComposedPage';
import Navbar from '../../components/Layout/Navbar';
import Contact from '../../components/Layout/Contact';
import { ContactConfig } from '../../models/ContactConfig';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { HeroConfig } from '../../models/HeroConfig';
import { isBookableService } from '../../models/AppointmentType';
import { mainCta } from '../../services/siteMode';
import { getSiteJitter } from '../../services/seed';
import { resetVisitorPassForTests } from '../../services/visitorPass';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

/**
 * LT-199 — a leads site (no calendar, the contact form is the conversion),
 * the per-business main button, and G1: a page without a calendar gets its
 * visitor pass from the contact form itself.
 */

const mocks = vi.hoisted(() => ({
  sendContactMessage: vi.fn(),
  handshake: vi.fn(),
  turnstileMounts: 0,
}));

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): unknown[] { return []; }
}
Element.prototype.scrollIntoView = vi.fn();

vi.mock('@marsidev/react-turnstile', async () => {
  const React = await import('react');
  return {
    Turnstile: ({ onSuccess }: { onSuccess?: (token: string) => void }) => {
      React.useEffect(() => {
        mocks.turnstileMounts += 1;
        onSuccess?.(`token-${mocks.turnstileMounts}`);
      }, []);
      return <div data-testid="turnstile-widget" />;
    },
  };
});
vi.mock('../../services/AuthService', () => ({ default: { handshake: mocks.handshake } }));
vi.mock('../../services/SmsService', () => ({ default: { sendContactMessage: mocks.sendContactMessage } }));
vi.mock('../../services/AppointmentService', () => ({
  default: { getInstance: () => ({ getCalendar: vi.fn().mockResolvedValue({ busy: [], classes: [] }), getAvailability: vi.fn() }) },
}));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key, language: 'en' }),
}));

const KITCHEN = { _id: 's1', name: 'Kitchen renovation', price: '', durationMS: '' };
const HAIRCUT = { _id: 's2', name: 'Haircut', price: '80', durationMS: 1800000 };
const BLOCKS = [
  { type: 'hero', variant: 'centered' },
  { type: 'priceCards' },
  { type: 'bookingBand', props: { text: 'Book now' } },
  { type: 'schedule' },
  { type: 'contact' },
];

const site = (conversion: 'book' | 'lead', services: unknown[], cta?: string, contactLayout?: string) =>
  WebsiteConfig.fromJSON({
    ...RAW_AI_RESPONSE_SHAPE,
    conversion,
    appointmentTypes: services,
    blocks: BLOCKS,
    design: { ...(RAW_AI_RESPONSE_SHAPE as { design?: object }).design, contactLayout, buttonStyle: 'solid' },
    components: {
      ...RAW_AI_RESPONSE_SHAPE.components,
      hero: { ...RAW_AI_RESPONSE_SHAPE.components.hero, ...(cta ? { cta } : {}) },
      schedule: { title: 'What we do', description: 'Kitchens and bathrooms' },
    },
  });

const renderSite = (config: WebsiteConfig) =>
  render(<ComposedPage config={config} jitter={getSiteJitter('leads-test')} isPreview={false} />);

describe('leads site page (LT-199)', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', NoopObserver);
    vi.stubGlobal('ResizeObserver', NoopObserver);
    mocks.handshake.mockReset().mockResolvedValue(true);
    resetVisitorPassForTests();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('has no calendar, no band and no link to one; the services still show and lead to the form', () => {
    const { container } = renderSite(site('lead', [KITCHEN], 'Get a quote'));
    expect(container.querySelector('#schedule')).toBeNull();
    expect(container.querySelectorAll('a[href="#schedule"]')).toHaveLength(0);
    expect(screen.getByText('Kitchen renovation').closest('a')).toHaveAttribute('href', '#contact');
  });

  it("the hero's main button carries the owner's words and goes to the form; no second contact button", () => {
    renderSite(site('lead', [KITCHEN], 'Get a quote'));
    const main = screen.getByRole('link', { name: 'Get a quote' });
    expect(main).toHaveAttribute('href', '#contact');
    expect(screen.queryByRole('link', { name: 'hero.contact' })).toBeNull();
  });

  it('a booking site keeps its calendar, and its main button carries its own words', () => {
    const { container } = renderSite(site('book', [HAIRCUT], 'Book a trim'));
    expect(container.querySelector('#schedule')).not.toBeNull();
    const buttons = screen.getAllByRole('link', { name: 'Book a trim' });
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((b) => expect(b).toHaveAttribute('href', '#schedule'));
  });

  it("the navbar's button follows the mode", () => {
    const leads = site('lead', [KITCHEN], 'Get a quote');
    leads.design = { ...leads.design, navbarStyle: 'minimal' } as typeof leads.design;
    const { container } = render(<Navbar websiteConfig={leads} />);
    const cta = Array.from(container.querySelectorAll('a')).find((a) => a.textContent === 'Get a quote');
    expect(cta).toHaveAttribute('href', '#contact');
    expect(container.querySelectorAll('a[href="#schedule"]')).toHaveLength(0);
  });

  it("a leads site's statement contact layout carries the form; a booking site's does not", () => {
    const leads = render(
      <Contact config={new ContactConfig(true, 'Talk to us', '')} contact={{ phone: '050-1234567', mail: 'a@b.co' }}
        workingDays={Array(7).fill(null)} layout="statement" conversion="lead" />
    );
    expect(leads.container.querySelector('form')).not.toBeNull();
    leads.unmount();
    const booking = render(
      <Contact config={new ContactConfig(true, 'Talk to us', '')} contact={{ phone: '050-1234567', mail: 'a@b.co' }}
        workingDays={Array(7).fill(null)} layout="statement" />
    );
    expect(booking.container.querySelector('form')).toBeNull();
  });
});

describe('the contact form gets its own visitor pass (LT-199, G1)', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', NoopObserver);
    mocks.sendContactMessage.mockReset().mockResolvedValue({ ok: true });
    mocks.handshake.mockReset().mockResolvedValue(true);
    mocks.turnstileMounts = 0;
    resetVisitorPassForTests();
  });
  afterEach(() => vi.unstubAllGlobals());

  const renderForm = () =>
    render(
      <Contact config={new ContactConfig(true, 'Contact', '')} contact={{ phone: '050-1234567', mail: 'a@b.co' }}
        workingDays={Array(7).fill(null)} layout="editorial" conversion="lead" />
    );
  const fill = () => {
    fireEvent.focus(screen.getByLabelText('contact.form.name'));
    fireEvent.change(screen.getByLabelText('contact.form.name'), { target: { value: 'Dana' } });
    fireEvent.change(screen.getByLabelText('contact.form.phone'), { target: { value: '0501234567' } });
  };

  it('runs the check when the visitor starts on the form, then sends', async () => {
    renderForm();
    expect(screen.queryByTestId('turnstile-widget')).toBeNull();
    fill();
    await waitFor(() => expect(mocks.handshake).toHaveBeenCalledWith('token-1'));
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => expect(mocks.sendContactMessage).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('contact.form.success')).toBeTruthy();
  });

  it('asks again once when the server says the pass expired, then sends', async () => {
    mocks.sendContactMessage
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true });
    renderForm();
    fill();
    await waitFor(() => expect(mocks.handshake).toHaveBeenCalledTimes(1));
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => expect(mocks.sendContactMessage).toHaveBeenCalledTimes(2));
    expect(mocks.handshake).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('contact.form.success')).toBeTruthy();
  });
});

describe('models (LT-199)', () => {
  it('parse the mode and the button text; absent reads as a booking site with the default text', () => {
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, conversion: 'lead' }).conversion).toBe('lead');
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE }).conversion).toBe('book');
    expect(HeroConfig.fromJSON({ title: 't', cta: '  Get a quote ' }).cta).toBe('Get a quote');
    expect(HeroConfig.fromJSON({ title: 't', cta: '   ' }).cta).toBeUndefined();
  });

  it('a service without a duration is content, not bookable', () => {
    expect(isBookableService({ name: 'Kitchen', durationMS: '' })).toBe(false);
    expect(isBookableService({ name: 'Haircut', durationMS: '1800000' })).toBe(true);
  });

  it('the main button: calendar, form, or none', () => {
    const t = (k: string) => k;
    expect(mainCta({ conversion: 'book', types: [HAIRCUT], own: '' }, t)).toEqual({ target: 'schedule', href: '#schedule', label: 'hero.book' });
    expect(mainCta({ conversion: 'lead', types: [HAIRCUT], own: 'Get a quote' }, t)).toEqual({ target: 'contact', href: '#contact', label: 'Get a quote' });
    expect(mainCta({ conversion: 'book', types: [KITCHEN], own: 'Book now' }, t)).toBeNull();
  });
});

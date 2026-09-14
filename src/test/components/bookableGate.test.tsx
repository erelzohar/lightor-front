import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import ComposedPage from '../../components/blocks/ComposedPage';
import Navbar from '../../components/Layout/Navbar';
import Footer from '../../components/Layout/Footer';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { AppointmentType, hasBookableServices } from '../../models/AppointmentType';
import { getSiteJitter } from '../../services/seed';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
Element.prototype.scrollIntoView = vi.fn();

vi.mock('@marsidev/react-turnstile', () => ({ Turnstile: () => null }));
vi.mock('../../services/AuthService', () => ({ default: { handshake: vi.fn().mockResolvedValue(true) } }));
vi.mock('../../services/AppointmentService', () => ({
  default: { getInstance: () => ({ getCalendar: vi.fn().mockResolvedValue({ busy: [], classes: [] }), getAvailability: vi.fn() }) },
}));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key, language: 'en' }),
}));

const HAIRCUT = { _id: 's1', name: 'Haircut', price: '80', durationMS: 1800000 };
const BLOCKS = [{ type: 'schedule' }, { type: 'bookingBand', props: { text: 'Book now' } }, { type: 'faq' }];

const renderComposed = (appointmentTypes: unknown[]) => {
  const config = WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, appointmentTypes, blocks: BLOCKS });
  return render(<ComposedPage config={config} jitter={getSiteJitter('gate-test')} isPreview={false} />);
};

const bookLinks = (container: HTMLElement) => container.querySelectorAll('a[href="#schedule"]').length;

const navConfig = (appointmentTypes: { name?: string }[], blocks?: { type: string; id: string }[]) => ({
  logoImageName: 'logo.png',
  businessName: 'Zohar Sweets',
  components: {
    navbar: { visible: true, darkMode: false, languageSwitcher: false },
    about: { visible: true },
    portfolio: { visible: true },
    contact: { visible: true },
  },
  design: { navbarStyle: 'floating' as const },
  appointmentTypes,
  ...(blocks ? { blocks } : {}),
});

const renderFooter = (appointmentsType: AppointmentType[]) =>
  render(
    <Footer
      config={{ visible: true, description: 'd' } as never}
      social={{ instagram: '', facebook: '', tiktok: '' } as never}
      businessName="Zohar Sweets"
      logoImageName="logo.png"
      appointmentsType={appointmentsType}
      websiteConfig={{ about: { visible: true }, portfolio: { visible: true }, contact: { visible: true } } as never}
      layout="columns"
    />
  );

/** LT-167 — a site with no named service has nothing to book, so it shows no schedule and no "Book" links. */
describe('bookable gate', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', NoopObserver);
    vi.stubGlobal('ResizeObserver', NoopObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('hasBookableServices needs at least one non-blank name', () => {
    expect(hasBookableServices(undefined)).toBe(false);
    expect(hasBookableServices([])).toBe(false);
    expect(hasBookableServices([{ name: '  ' }, null])).toBe(false);
    expect(hasBookableServices([{ name: '' }, { name: 'Haircut' }])).toBe(true);
  });

  it('composed page: no services → no schedule, no booking band, and the next section takes the first slot', () => {
    const { container } = renderComposed([]);
    expect(container.querySelector('#schedule')).toBeNull();
    expect(container.querySelector('#booking-section')).toBeNull();
    expect(bookLinks(container)).toBe(0);
    expect(container.querySelector('#faq')?.className).toContain('bg-light-bg');
  });

  it('composed page: a named service brings the schedule and the band back', () => {
    const { container } = renderComposed([HAIRCUT]);
    expect(container.querySelector('#schedule')).not.toBeNull();
    expect(bookLinks(container)).toBeGreaterThan(0);
  });

  it('composed page: a service with a blank name counts as none', () => {
    const { container } = renderComposed([{ ...HAIRCUT, name: '   ' }]);
    expect(container.querySelector('#schedule')).toBeNull();
  });

  it('navbar: no "Book" link or button without services, in both the composed and the legacy menu', () => {
    const blocks = [{ id: 'b1', type: 'hero' }, { id: 'b2', type: 'schedule' }, { id: 'b3', type: 'contact' }];
    expect(bookLinks(render(<Navbar websiteConfig={navConfig([], blocks)} />).container)).toBe(0);
    expect(bookLinks(render(<Navbar websiteConfig={navConfig([])} />).container)).toBe(0);
    expect(bookLinks(render(<Navbar websiteConfig={navConfig([HAIRCUT], blocks)} />).container)).toBeGreaterThan(0);
    expect(bookLinks(render(<Navbar websiteConfig={navConfig([HAIRCUT])} />).container)).toBeGreaterThan(0);
  });

  it('footer: no "Book" link and no services column without services', () => {
    const empty = renderFooter([]).container;
    expect(bookLinks(empty)).toBe(0);
    expect(empty.querySelector('#footer-services')).toBeNull();
    const withOne = renderFooter([AppointmentType.fromJSON(HAIRCUT)]).container;
    expect(bookLinks(withOne)).toBe(1);
    expect(withOne.querySelector('#footer-services')).not.toBeNull();
  });
});

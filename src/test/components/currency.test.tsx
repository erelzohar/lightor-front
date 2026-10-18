import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ComposedPage from '../../components/blocks/ComposedPage';
import Schedule from '../../components/Layout/Schedule/Schedule';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { AppointmentType } from '../../models/AppointmentType';
import { ScheduleConfig } from '../../models/ScheduleConfig';
import { getSiteJitter } from '../../services/seed';
import { formatPrice } from '../../utils/currency';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
vi.stubGlobal('IntersectionObserver', NoopObserver);
Element.prototype.scrollIntoView = vi.fn();

vi.mock('@marsidev/react-turnstile', () => ({ Turnstile: (): null => null }));
vi.mock('../../services/AuthService', () => ({ default: { handshake: vi.fn().mockResolvedValue(true) } }));
vi.mock('../../services/AppointmentService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/AppointmentService')>()),
  default: {
    getInstance: () => ({ getCalendar: vi.fn().mockResolvedValue({ busy: [], classes: [] }), getAvailability: vi.fn().mockResolvedValue([]) }),
  },
}));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key, language: 'en' }),
}));

const SERVICES = [
  { _id: 's1', name: 'Gel polish', price: '45', durationMS: 3600000 },
  { _id: 's2', name: 'Nail art', price: 'from 20', durationMS: 1800000 },
];

const page = (type: 'ledger' | 'priceCards', currency?: string) => {
  const config = WebsiteConfig.fromJSON({
    ...RAW_AI_RESPONSE_SHAPE,
    ...(currency ? { currency } : {}),
    appointmentTypes: SERVICES,
    blocks: [{ id: 'b1', type }],
  });
  return render(<ComposedPage config={config} jitter={getSiteJitter('currency')} isPreview={false} />);
};

/**
 * LT-395 — a business prices in its own money. Every price on the site said
 * "₪" whatever the country: an English site for a salon in Texas listed its
 * gel polish at ₪45.
 */
describe("the business's currency", () => {
  it('puts the sign in front of a plain number only', () => {
    expect(formatPrice('45', 'USD')).toBe('$45');
    expect(formatPrice(' 12.5 ', 'EUR')).toBe('€12.5');
    expect(formatPrice('30', 'GBP')).toBe('£30');
    expect(formatPrice('80', undefined)).toBe('₪80');
    expect(formatPrice('80', 'JPY')).toBe('₪80');
    expect(formatPrice('from 20', 'USD')).toBe('from 20');
    expect(formatPrice('  ', 'USD')).toBe('');
  });

  it('is read from the config, shekels when absent or unknown', () => {
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, currency: 'usd' }).currency).toBe('USD');
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, currency: 'JPY' }).currency).toBe('ILS');
    expect(WebsiteConfig.fromJSON(RAW_AI_RESPONSE_SHAPE).currency).toBe('ILS');
  });

  it.each(['ledger', 'priceCards'] as const)('%s shows the prices in it', (type) => {
    page(type, 'USD');
    expect(screen.getByText('$45')).toBeTruthy();
    expect(screen.getByText('from 20')).toBeTruthy();
    expect(screen.queryByText(/₪/)).toBeNull();
  });

  it.each(['ledger', 'priceCards'] as const)('%s stays in shekels for a site made before it', (type) => {
    page(type);
    expect(screen.getByText('₪45')).toBeTruthy();
  });

  it('the booking calendar lists the services in it', async () => {
    render(
      <Schedule
        config={new ScheduleConfig('Book', 'Pick')}
        workingDays={Array(7).fill('09:00-17:00') as (string | null)[]}
        user_id="u1"
        phone="+15125550100"
        businessName="Glow Nails"
        timeToCancel={0}
        vacations={[]}
        dateOverrides={[]}
        appointmentTypes={SERVICES.map((s) => new AppointmentType(s._id, s.name, s.price, 'u1', String(s.durationMS)))}
        header={{ style: 'centered' } as never}
        headerScale={'default' as never}
        timeZone="America/Chicago"
        currency="USD"
        isPreview
      />
    );
    expect(await screen.findByText(/\| \$45/)).toBeTruthy();
    expect(screen.getByText(/\| from 20/)).toBeTruthy();
    expect(screen.queryByText(/₪/)).toBeNull();
  });
});

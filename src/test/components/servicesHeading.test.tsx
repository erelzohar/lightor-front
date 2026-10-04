import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ComposedPage from '../../components/blocks/ComposedPage';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { getSiteJitter } from '../../services/seed';
import { navLinksFromBlocks, sectionTitlesOf } from '../../services/navLinks';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
vi.stubGlobal('IntersectionObserver', NoopObserver);
Element.prototype.scrollIntoView = vi.fn();

vi.mock('@marsidev/react-turnstile', () => ({ Turnstile: () => null }));
vi.mock('../../services/AuthService', () => ({ default: { handshake: vi.fn().mockResolvedValue(true) } }));
vi.mock('../../services/AppointmentService', () => ({
  default: { getInstance: () => ({ getCalendar: vi.fn().mockResolvedValue({ busy: [], classes: [] }), getAvailability: vi.fn() }) },
}));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key, language: 'he' }),
}));

const UNPRICED = [
  { _id: 's1', name: 'הרחקת יונים', price: '', durationMS: 3600000 },
  { _id: 's2', name: 'התקנת דוקרנים', durationMS: 3600000 },
];
const PRICED = [{ _id: 's1', name: 'תספורת', price: '80', durationMS: 1800000 }, ...UNPRICED];

const renderPage = (type: 'ledger' | 'priceCards', appointmentTypes: unknown[], services?: { title: string }) => {
  const config = WebsiteConfig.fromJSON({
    ...RAW_AI_RESPONSE_SHAPE,
    appointmentTypes,
    components: { ...RAW_AI_RESPONSE_SHAPE.components, ...(services ? { services } : {}) },
    blocks: [{ id: 'b1', type }],
  });
  return render(<ComposedPage config={config} jitter={getSiteJitter('services-heading')} isPreview={false} />);
};

/**
 * LT-220 — the services section's heading. It said "המחירון" (the price list)
 * whatever the services were, prices or not, and no field held it, so the AI
 * editor could not rename it however it was asked.
 */
describe('the services heading', () => {
  it.each(['ledger', 'priceCards'] as const)('%s: "the services" when no service shows a price', (type) => {
    renderPage(type, UNPRICED);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('השירותים');
    expect(screen.queryByText('המחירון')).toBeNull();
  });

  it.each(['ledger', 'priceCards'] as const)('%s: "the price list" when one does', (type) => {
    renderPage(type, PRICED);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('המחירון');
  });

  it.each(['ledger', 'priceCards'] as const)("%s: the owner's own heading wins", (type) => {
    renderPage(type, PRICED, { title: 'הטיפולים שלנו' });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('הטיפולים שלנו');
    renderPage(type, UNPRICED, { title: '   ' });
    expect(screen.getAllByRole('heading', { level: 2 }).at(-1)).toHaveTextContent('השירותים');
  });

  it('is read from components.services.title', () => {
    const parsed = WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, components: { ...RAW_AI_RESPONSE_SHAPE.components, services: { title: 'מה אנחנו עושים' } } });
    expect(parsed.components.services.title).toBe('מה אנחנו עושים');
    expect(WebsiteConfig.fromJSON(RAW_AI_RESPONSE_SHAPE).components.services.title).toBe('');
  });
});

describe('the services menu link', () => {
  const blocks = [{ id: 'b1', type: 'ledger' }];

  it('says "price list" only over prices', () => {
    expect(navLinksFromBlocks(blocks)[0]).toMatchObject({ href: '#services', key: 'nav.prices', fallbackHe: 'מחירון' });
    expect(navLinksFromBlocks(blocks, {}, { priced: false })[0]).toMatchObject({ href: '#services', key: 'nav.services', fallbackHe: 'שירותים' });
  });

  it("reads as the owner's heading when there is one", () => {
    const titles = sectionTitlesOf({ services: { title: 'הטיפולים' } });
    expect(navLinksFromBlocks(blocks, titles, { priced: false })[0].title).toBe('הטיפולים');
  });
});

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render } from '@testing-library/react';
import ComposedPage from '../../components/blocks/ComposedPage';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { getSiteJitter } from '../../services/seed';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';
import { PARTS, loadPart, partsFor, partWaits, preloadAllParts, preloadParts, resetPartsForTest, type PartKey } from '../../designs/parts';

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
vi.mock('../../services/AppointmentService', () => ({
  default: { getInstance: () => ({ getCalendar: vi.fn().mockResolvedValue({ busy: [], classes: [] }), getAvailability: vi.fn() }) },
}));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'he' }),
}));

const PRODUCTS = (n: number) => ({
  total: n,
  pages: true,
  items: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, slug: `p${i}`, name: `Product ${i}`, price: 10 + i, images: [{ url: `https://x/p${i}.jpg` }] })),
});
const PICTURES = Array.from({ length: 6 }, (_, i) => ({ url: `https://x/g${i}.jpg`, title: `g${i}` }));
const STEPS = [{ title: 'Pick' }, { title: 'Bake' }, { title: 'Collect' }];

/** A page of every block, each in a look that comes in its own part. */
const EVERY_BLOCK = [
  { type: 'hero', variant: 'collage' },
  { type: 'intro' },
  { type: 'features', variant: 'stack' },
  { type: 'gallery', variant: 'clothesline' },
  { type: 'products', variant: 'orbit' },
  { type: 'quote', variant: 'editorial' },
  { type: 'ledger' },
  { type: 'interlude' },
  { type: 'bookingBand', props: { text: 'Book now' } },
  { type: 'ticker' },
  { type: 'announcement', props: { text: 'Open on Friday' } },
  { type: 'manifesto', props: { text: 'Made by hand' } },
  { type: 'stats', props: { items: [{ value: '10', label: 'years' }] } },
  { type: 'pullQuote', props: { text: 'Lovely' } },
  { type: 'process', props: { steps: STEPS } },
  { type: 'priceCards' },
  { type: 'hours' },
  { type: 'photoPair' },
  { type: 'beforeAfter' },
  { type: 'mapStrip' },
  { type: 'logoMark' },
  { type: 'social' },
  { type: 'schedule' },
  { type: 'contact' },
  { type: 'footer' },
];

const configOf = (blocks: unknown[], extra: Record<string, unknown> = {}) => WebsiteConfig.fromJSON({
  ...RAW_AI_RESPONSE_SHAPE,
  address: { state: '', city: 'Haifa', street: 'Herzl 1', other: '' },
  social: { instagram: 'https://instagram.com/x', facebook: '', tiktok: '' },
  components: {
    ...RAW_AI_RESPONSE_SHAPE.components,
    portfolio: { ...RAW_AI_RESPONSE_SHAPE.components.portfolio, items: PICTURES },
    about: { ...RAW_AI_RESPONSE_SHAPE.components.about, features: [{ title: 'f', description: 'd' }] },
    testimonials: { visible: true, title: 't', items: [{ name: 'Dana', text: 'Great' }, { name: 'Lior', text: 'Lovely' }] },
  },
  products: PRODUCTS(4),
  blocks,
  ...extra,
});

/** The parts a page needs, then the page: it must not wait for a single one. */
const drawsAtOnce = async (config: WebsiteConfig) => {
  resetPartsForTest();
  await preloadParts(partsFor(config, '/').now);
  render(<ComposedPage config={config} jitter={getSiteJitter('parts-test')} isPreview={false} />);
  return partWaits();
};

describe('the design parts (LT-603)', () => {
  beforeEach(() => resetPartsForTest());
  afterAll(() => preloadAllParts());

  it('every part loads', async () => {
    for (const key of Object.keys(PARTS) as PartKey[]) {
      const mod = (await loadPart(key)) as Record<string, unknown>;
      expect(Object.keys(mod).length, key).toBeGreaterThan(0);
    }
  });

  it('a page of every block, each in a look of its own part, waits for nothing it named', async () => {
    expect(await drawsAtOnce(configOf(EVERY_BLOCK))).toBe(0);
  });

  it.each(['belt', 'hanger', 'coverflow', 'drops', 'well', 'bento'])('products drawn as %s wait for nothing', async (variant) => {
    expect(await drawsAtOnce(configOf([{ type: 'products', variant }, { type: 'footer' }]))).toBe(0);
  });

  it.each(['curve', 'cascade', 'grid', 'filmstrip'])('a gallery drawn as %s waits for nothing', async (variant) => {
    expect(await drawsAtOnce(configOf([{ type: 'gallery', variant }]))).toBe(0);
  });

  it.each(['parallax', 'expand', 'aero', 'slant', 'split'])('a hero drawn as %s waits for nothing', async (variant) => {
    expect(await drawsAtOnce(configOf([{ type: 'hero', variant }]))).toBe(0);
  });

  it('a single product, drawn in full, waits for nothing', async () => {
    expect(await drawsAtOnce(configOf([{ type: 'products' }], { products: PRODUCTS(1) }))).toBe(0);
  });

  it('a page asks only for what it draws', () => {
    const { now } = partsFor(configOf([{ type: 'hero', variant: 'split' }, { type: 'faq' }, { type: 'contact' }, { type: 'footer' }]), '/');
    expect(now).toEqual([]);
  });

  it('a hidden block downloads nothing', () => {
    const { now } = partsFor(configOf([{ type: 'gallery', variant: 'clothesline', mod: { hidden: true } }, { type: 'footer' }]), '/');
    expect(now).not.toContain('galleryClothesline');
    expect(now).not.toContain('gallery');
  });

  it("a leads site leaves the booking flow out, a booking site's page brings it", () => {
    expect(partsFor(configOf([{ type: 'schedule' }], { conversion: 'lead' }), '/').now).not.toContain('schedule');
    expect(partsFor(configOf([{ type: 'schedule' }]), '/').now).toContain('schedule');
  });

  it("the products' pages load after the home page, or first on their own address", () => {
    const config = configOf([{ type: 'products' }]);
    expect(partsFor(config, '/').soon).toEqual(expect.arrayContaining(['productsPage', 'productPage']));
    expect(partsFor(config, '/').now).not.toContain('productsPage');
    expect(partsFor(config, '/products').now).toEqual(expect.arrayContaining(['productsPage', 'productPage', 'products']));
    expect(partsFor(config, '/products/p1').now).toContain('productPage');
  });

  it('a booking link brings its page and the booking flow before any config', () => {
    expect(partsFor(null, '/manage/abc').now).toEqual(expect.arrayContaining(['manage', 'schedule']));
  });

  it('a page from before blocks names its parts from its design', () => {
    const legacy = configOf([], { design: { heroLayout: 'collage', portfolioLayout: 'curve', productsLayout: 'belt', aboutLayout: 'stack', testimonialsLayout: 'editorial', servicesLayout: 'ledger', bookingBand: 'band', decor: 'sonar' } });
    expect(partsFor(legacy, '/').now).toEqual(expect.arrayContaining([
      'heroCollage', 'heroSonar', 'gallery', 'galleryCurve', 'products', 'productBelt', 'featureStack', 'editorialQuotes', 'ledger', 'bookingBand', 'interlude', 'schedule',
    ]));
  });

  it('the contact window waits in the quiet after the page shows', () => {
    expect(partsFor(configOf([{ type: 'footer' }]), '/').soon).toContain('contactModal');
  });
});

describe("the site's main script (LT-603)", () => {
  // Every source file, to follow the main script's static imports by hand.
  const sources = import.meta.glob('../../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const files = new Set(Object.keys(sources).filter((f) => !f.includes('/test/')));
  const resolve = (from: string, spec: string): string | null => {
    if (!spec.startsWith('.')) return null;
    const base = from.split('/').slice(0, -1);
    for (const part of spec.split('/')) {
      if (part === '..') base.pop();
      else if (part !== '.') base.push(part);
    }
    const path = base.join('/');
    for (const candidate of [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`, `${path}/index.tsx`]) if (files.has(candidate)) return candidate;
    return null;
  };
  // `import x from`, `import { y } from`, `export … from` - not `import type`, not `import()`.
  const STATIC = /(?:^|\n)\s*(?:import|export)\s+(?!type\s)(?:[^'"()]*?\sfrom\s+)?['"]([^'"]+)['"]/g;
  const reachable = (entry: string): Set<string> => {
    const seen = new Set<string>([entry]);
    const queue = [entry];
    while (queue.length) {
      const file = queue.pop()!;
      for (const m of (sources[file] ?? '').matchAll(STATIC)) {
        const next = resolve(file, m[1]);
        if (next && !seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
    return seen;
  };
  // Read from parts.tsx itself: one `key: () => import('…')` per part.
  const PART_FILES = (Object.keys(PARTS) as PartKey[]).map((key) => {
    const spec = new RegExp(`\\b${key}: \\(\\) => import\\('([^']+)'\\)`).exec(sources['../../designs/parts.tsx'] ?? '')?.[1] ?? '';
    return resolve('../../designs/parts.tsx', spec);
  });

  it("knows every part's file", () => {
    expect(PART_FILES.every(Boolean)).toBe(true);
  });

  it('reaches no part through a static import: a design imported straight into a section lands in every site', () => {
    const main = reachable('../../main.tsx');
    expect(main.size).toBeGreaterThan(50);
    expect(PART_FILES.filter((f) => f && main.has(f))).toEqual([]);
  });

});

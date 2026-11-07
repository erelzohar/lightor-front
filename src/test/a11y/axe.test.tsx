import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import axe from 'axe-core';
import ComposedPage from '../../components/blocks/ComposedPage';
import { MemoryRouter } from 'react-router-dom';
import ProductsPage from '../../components/products/ProductsPage';
import ProductPage from '../../components/products/ProductPage';
import Navbar from '../../components/Layout/Navbar';
import Schedule from '../../components/Layout/Schedule/Schedule';
import AccessibilityMenu from '../../components/a11y/AccessibilityMenu';
import AccessibilityStatement from '../../components/a11y/AccessibilityStatement';
import { MaterialSelect } from '../../components/Layout/Schedule/ScheduleForms';
import { ListChecks } from 'lucide-react';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { getSiteJitter } from '../../services/seed';
import { openStatement, closeStatement } from '../../services/a11yStatement';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

/**
 * LT-356 — the automatic accessibility check. axe-core (the engine behind
 * most accessibility checkers) runs over a full page of every section, the
 * booking flow step by step, and the accessibility menu and statement, in
 * Hebrew, English and Arabic. Any WCAG 2.x A/AA violation it can see fails
 * the build, so what phase 2 fixed cannot quietly break again.
 *
 * What jsdom cannot judge is switched off: colour contrast (no rendering;
 * the palette clamps in services/contrast cover it) and landmarks/regions
 * (a component rendered alone has no page around it).
 */

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
vi.stubGlobal('IntersectionObserver', NoopObserver);
Element.prototype.scrollIntoView = vi.fn();

let lang = 'he';
vi.mock('@marsidev/react-turnstile', () => ({ Turnstile: (): null => null }));
vi.mock('../../services/AuthService', () => ({ default: { handshake: vi.fn().mockResolvedValue(true) } }));
vi.mock('../../services/AppointmentService', () => ({
  default: { getInstance: () => ({ getCalendar: vi.fn().mockResolvedValue({ busy: [], classes: [] }), getAvailability: vi.fn() }) },
}));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${Object.values(params).join(' ')}` : key),
    language: lang,
    setLanguage: () => {},
    setContentLanguage: () => {},
  }),
}));

const ITEMS = [1, 2, 3, 4].map((n) => ({ url: `https://picsum.photos/seed/${n}/800/600`, title: `Work ${n}`, description: `About ${n}`, alt: `A finished piece of work, number ${n}` }));

const fullConfig = (blocks: unknown[]) => WebsiteConfig.fromJSON({
  ...RAW_AI_RESPONSE_SHAPE,
  components: {
    ...RAW_AI_RESPONSE_SHAPE.components,
    portfolio: { visible: true, title: 'Gallery', description: 'Our work', items: ITEMS },
    testimonials: { visible: true, title: 'Reviews', items: [{ name: 'Noa', text: 'Great' }, { name: 'Dan', text: 'Lovely' }] },
    faq: { visible: true, title: 'Questions', items: [{ question: 'Parking?', answer: 'Yes' }, { question: 'Cards?', answer: 'Yes' }] },
    about: { visible: true, title: 'About', description: 'd', paragraphs: { intro: 'We cut hair.', mission: 'Well.' }, features: [{ icon: 'Star', title: 'Fast', description: 'Quick' }] },
  },
  appointmentTypes: [
    { _id: 's1', name: 'Haircut', price: '100', durationMS: '2400000' },
    { _id: 's2', name: 'Beard', price: '60', durationMS: '1200000' },
  ],
  blocks,
});

const BLOCKS = [
  { type: 'hero' }, { type: 'intro' }, { type: 'features' }, { type: 'gallery' }, { type: 'quote' },
  { type: 'faq' }, { type: 'ledger' }, { type: 'process', props: { steps: [{ title: 'Pick' }, { title: 'Come' }] } },
  { type: 'hours' }, { type: 'schedule' }, { type: 'contact' }, { type: 'footer' },
];

const RULES: axe.RunOptions = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
  },
};

const violationsIn = async (node: Element): Promise<string[]> => {
  const result = await axe.run(node, RULES);
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
};

describe.each(['he', 'en', 'ar'])('no WCAG A/AA violation axe can see (%s)', (language) => {
  beforeEach(() => {
    lang = language;
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
    act(() => closeStatement());
  });

  it('a page with every common section', async () => {
    const { container } = render(<ComposedPage config={fullConfig(BLOCKS)} jitter={getSiteJitter('axe')} isPreview />);
    expect(await violationsIn(container)).toEqual([]);
  });

  it('every products layout, and a single product (LT-540)', async () => {
    const product = (i: number) => ({
      id: `p${i}`, slug: `p-${i}`, name: `Product ${i}`, summary: 'Made by hand', price: 12000, category: i % 2 ? 'Rings' : 'Chains',
      images: [{ url: `a${i}.webp` }, { url: `b${i}.webp` }], details: ['925 silver'], description: 'Words', soldOut: i === 2,
    });
    const shelf = { total: 6, pages: true, items: Array.from({ length: 6 }, (_, i) => product(i)) };
    for (const variant of ['well', 'swap', 'bento', 'list', 'belt', 'hanger', 'coverflow', 'orbit']) {
      const config = fullConfig([{ type: 'products', variant }]);
      config.products = shelf;
      const { container, unmount } = render(<ComposedPage config={config} jitter={getSiteJitter('axe')} isPreview />);
      expect([variant, ...(await violationsIn(container))]).toEqual([variant]);
      unmount();
    }
    const one = fullConfig([{ type: 'products' }]);
    one.products = { total: 1, pages: false, items: [product(0)] };
    const { container } = render(<ComposedPage config={one} jitter={getSiteJitter('axe')} isPreview />);
    expect(await violationsIn(container)).toEqual([]);
  });

  it('the highlights in orbs and the steps as pinned notes (LT-583)', async () => {
    const config = fullConfig([
      { type: 'features', variant: 'orbs' },
      { type: 'process', variant: 'pinned', props: { title: 'How', steps: [{ title: 'Pick', text: 'One' }, { title: 'Come' }, { title: 'Enjoy', text: 'Three' }] } },
    ]);
    config.components.about.features = [
      { icon: 'Star', title: 'Fast', description: 'Quick' }, { icon: 'Heart', title: 'Kind', description: 'Warm' }, { icon: 'Clock', title: 'On time', description: 'Always' },
    ];
    const { container } = render(<ComposedPage config={config} jitter={getSiteJitter('axe')} isPreview />);
    expect(await violationsIn(container)).toEqual([]);
  });

  it("LT-588's highlights with pictures, the drops card and the two new cards", async () => {
    const product = (i: number) => ({
      id: `p${i}`, slug: `p-${i}`, name: `Product ${i}`, summary: 'Made by hand', price: 12000, category: i % 2 ? 'Rings' : 'Chains',
      images: [{ url: `a${i}.webp` }, { url: `b${i}.webp` }], details: ['925 silver'], soldOut: i === 2,
      colors: [{ name: 'Red', hex: '#cc2233' }, { name: 'Black', hex: '#111111' }], sizes: ['S', 'M'],
    });
    const shelf = { total: 6, pages: true, items: Array.from({ length: 6 }, (_, i) => product(i)) };
    const stack = fullConfig([{ type: 'features', variant: 'stack' }, { type: 'products', variant: 'drops' }]);
    stack.components.about.features = [{ icon: 'Star', title: 'Fast', description: 'Quick' }, { icon: 'Heart', title: 'Kind', description: 'Warm' }];
    stack.products = shelf;
    const first = render(<ComposedPage config={stack} jitter={getSiteJitter('axe')} isPreview />);
    expect(['stack + drops', ...(await violationsIn(first.container))]).toEqual(['stack + drops']);
    first.unmount();
    for (const card of ['reveal', 'options']) {
      const config = fullConfig([{ type: 'products', variant: 'well' }]);
      config.products = shelf;
      config.design.productCard = card;
      const { container, unmount } = render(<ComposedPage config={config} jitter={getSiteJitter('axe')} isPreview />);
      expect([card, ...(await violationsIn(container))]).toEqual([card]);
      unmount();
    }
  });

  it("LT-587/588's products pages: by category, rows, shelves, the shop, and a product's detail page", async () => {
    const drafts = Array.from({ length: 6 }, (_, i) => ({
      id: `draft-${i}`, slug: `draft-${i}`, name: `Product ${i}`, price: 1000 + i * 500, category: i % 3 ? 'Rings' : undefined,
      images: [{ url: `a${i}.webp` }], details: ['Silver'], colors: [{ name: 'Red', hex: '#cc2233' }], sizes: ['M'],
    }));
    for (const layout of ['well', 'rows', 'shelves', 'shop']) {
      const { container, unmount } = render(<MemoryRouter initialEntries={['/products']}><ProductsPage businessName="Shop" drafts={drafts} layout={layout as never} /></MemoryRouter>);
      expect([layout, ...(await violationsIn(container))]).toEqual([layout]);
      unmount();
    }
    const { container } = render(<MemoryRouter initialEntries={['/products/draft-1']}><ProductPage slug="draft-1" businessName="Shop" drafts={drafts} layout="detail" /></MemoryRouter>);
    expect(['detail', ...(await violationsIn(container))]).toEqual(['detail']);
  });

  it("LT-591's slant hero and the bubbles contact section", async () => {
    const config = fullConfig([{ type: 'hero', variant: 'slant' }, { type: 'contact', variant: 'bubbles' }]);
    const { container } = render(<ComposedPage config={config} jitter={getSiteJitter('axe')} isPreview />);
    expect(await violationsIn(container)).toEqual([]);
  });

  it("LT-605's mesh hero with the splash button, the wall of shelves and the two product pages", async () => {
    const product = (i: number) => ({
      id: `draft-${i}`, slug: `draft-${i}`, name: `Product ${i}`, summary: 'Made by hand', price: 1000 + i * 500, category: i % 2 ? 'Rings' : 'Chains',
      images: [{ url: `a${i}.webp` }, { url: `b${i}.webp` }, { url: `c${i}.webp` }, { url: `d${i}.webp` }], details: ['Silver'],
      colors: [{ name: 'Red', hex: '#cc2233' }, { name: 'Black', hex: '#111111' }], sizes: ['S', 'M'], soldOut: i === 2,
    });
    const drafts = Array.from({ length: 6 }, (_, i) => product(i));
    const home = fullConfig([{ type: 'hero', variant: 'mesh' }, { type: 'products', variant: 'wall' }]);
    home.design.buttonStyle = 'splash';
    home.products = { total: 6, pages: true, items: drafts };
    const first = render(<ComposedPage config={home} jitter={getSiteJitter('axe')} isPreview />);
    expect(['mesh + wall', ...(await violationsIn(first.container))]).toEqual(['mesh + wall']);
    first.unmount();
    const list = render(<MemoryRouter initialEntries={['/products']}><ProductsPage businessName="Shop" drafts={drafts} layout="wall" /></MemoryRouter>);
    expect(['products wall', ...(await violationsIn(list.container))]).toEqual(['products wall']);
    list.unmount();
    for (const layout of ['stand', 'stage']) {
      const { container, unmount } = render(<MemoryRouter initialEntries={['/products/draft-1']}><ProductPage slug="draft-1" businessName="Shop" drafts={drafts} layout={layout as never} /></MemoryRouter>);
      expect([layout, ...(await violationsIn(container))]).toEqual([layout]);
      unmount();
    }
  });

  it('every gallery layout', async () => {
    for (const variant of ['grid', 'masonry', 'filmstrip', 'polaroid', 'bento', 'scroller', 'spotlight', 'carousel', 'clothesline', 'curve', 'cascade']) {
      const { container, unmount } = render(<ComposedPage config={fullConfig([{ type: 'gallery', variant }])} jitter={getSiteJitter('axe')} isPreview />);
      expect([variant, ...(await violationsIn(container))]).toEqual([variant]);
      unmount();
    }
  });

  it('every footer, contact and hero layout', async () => {
    const layouts: [string, string[]][] = [
      ['footer', ['columns', 'minimal', 'line', 'ticker']],
      ['quote', ['cards', 'quote', 'bubbles', 'spotlight', 'editorial']],
      ['ledger', ['ledger', 'roman', 'menu', 'board', 'table', 'tags', 'soft', 'arch', 'index']],
      ['bookingBand', ['poster', 'slant', 'quiet', 'card', 'ticket', 'split']],
      ['manifesto', ['display', 'ruled', 'outline', 'marker', 'soft']],
      ['contact', ['split', 'stacked', 'poster', 'editorial', 'statement', 'band', 'cards', 'bubbles']],
      ['hero', ['centered', 'split', 'image-right', 'poster-split', 'poster-statement', 'parallax', 'expand', 'aero', 'collage', 'slant', 'mesh']],
    ];
    for (const [type, variants] of layouts) {
      for (const variant of variants) {
        const { container, unmount } = render(<ComposedPage config={fullConfig([{ type, variant, props: { text: 'A line' } }])} jitter={getSiteJitter('axe')} isPreview />);
        const label = `${type}:${variant}`;
        expect([label, ...(await violationsIn(container))]).toEqual([label]);
        unmount();
      }
    }
  });

  it('every navbar style, with the phone menu open', async () => {
    for (const navbarStyle of ['floating', 'solid', 'transparent', 'minimal', 'centered', 'pill', 'split']) {
      const config = fullConfig([{ type: 'hero' }, { type: 'gallery' }, { type: 'contact' }]);
      config.design = { ...config.design, navbarStyle } as typeof config.design;
      const { container, unmount } = render(<Navbar websiteConfig={config} isPreview />);
      const burger = container.querySelector<HTMLButtonElement>('button[aria-expanded]');
      if (burger) fireEvent.click(burger);
      expect([navbarStyle, ...(await violationsIn(container))]).toEqual([navbarStyle]);
      unmount();
    }
  });

  it('the booking flow, step by step', async () => {
    const config = fullConfig([]);
    const { container } = render(
      <Schedule
        config={config.components.schedule}
        workingDays={['09:00-17:00', '09:00-17:00', '09:00-17:00', '09:00-17:00', '09:00-17:00', '09:00-17:00', '09:00-17:00']}
        user_id="u1"
        phone="050-0000000"
        businessName="Studio"
        timeToCancel={3600000}
        vacations={[]}
        appointmentTypes={config.appointmentTypes}
        isPreview
      />,
    );
    expect(['service step', ...(await violationsIn(container))]).toEqual(['service step']);

    fireEvent.click(screen.getByRole('button', { name: /Haircut/ }));
    expect(['date step', ...(await violationsIn(container))]).toEqual(['date step']);

    const day = container.querySelector<HTMLButtonElement>('[role="group"] .grid button:not([disabled])');
    expect(day).not.toBeNull();
    fireEvent.click(day!);
    expect(['time step', ...(await violationsIn(container))]).toEqual(['time step']);

    const slot = [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) => /^\s*\d{2}:\d{2}\s*$/.test(b.textContent ?? ''));
    expect(slot).toBeDefined();
    fireEvent.click(slot!);
    expect(['details step', ...(await violationsIn(container))]).toEqual(['details step']);
  });

  it("an owner's choice question, closed and open (LT-365)", async () => {
    const { container } = render(
      <MaterialSelect icon={ListChecks} label="Room" value="" options={['Front', 'Back']} placeholder="Choose" onChange={() => {}} name="answer-room" id="q-room" error="Pick one" />
    );
    expect(await violationsIn(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: /Room/ }));
    // The open list is portalled to <body>.
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(await violationsIn(document.body)).toEqual([]);
  });

  it('the accessibility menu and statement', async () => {
    const { container } = render(<><AccessibilityMenu aboveContactButton={false} /><AccessibilityStatement businessName="Studio" phone="050-0000000" bookable /></>);
    fireEvent.click(screen.getByRole('button', { name: 'a11y.menu.button' }));
    act(() => openStatement());
    expect(await violationsIn(container)).toEqual([]);
  });
});

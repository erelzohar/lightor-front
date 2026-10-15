import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import axe from 'axe-core';
import ComposedPage from '../../components/blocks/ComposedPage';
import Navbar from '../../components/Layout/Navbar';
import Schedule from '../../components/Layout/Schedule/Schedule';
import AccessibilityMenu from '../../components/a11y/AccessibilityMenu';
import AccessibilityStatement from '../../components/a11y/AccessibilityStatement';
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

  it('every gallery layout', async () => {
    for (const variant of ['grid', 'masonry', 'filmstrip', 'polaroid', 'bento', 'scroller', 'spotlight', 'carousel']) {
      const { container, unmount } = render(<ComposedPage config={fullConfig([{ type: 'gallery', variant }])} jitter={getSiteJitter('axe')} isPreview />);
      expect([variant, ...(await violationsIn(container))]).toEqual([variant]);
      unmount();
    }
  });

  it('every footer, contact and hero layout', async () => {
    const layouts: [string, string[]][] = [
      ['footer', ['columns', 'minimal', 'line', 'ticker']],
      ['contact', ['split', 'stacked', 'poster', 'editorial', 'statement', 'band', 'cards']],
      ['hero', ['centered', 'split', 'image-right', 'poster-split', 'poster-statement']],
    ];
    for (const [type, variants] of layouts) {
      for (const variant of variants) {
        const { container, unmount } = render(<ComposedPage config={fullConfig([{ type, variant }])} jitter={getSiteJitter('axe')} isPreview />);
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

  it('the accessibility menu and statement', async () => {
    const { container } = render(<><AccessibilityMenu aboveContactButton={false} /><AccessibilityStatement businessName="Studio" phone="050-0000000" bookable /></>);
    fireEvent.click(screen.getByRole('button', { name: 'a11y.menu.button' }));
    act(() => openStatement());
    expect(await violationsIn(container)).toEqual([]);
  });
});

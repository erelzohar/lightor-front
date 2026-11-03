import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Portfolio from '../../components/Portfolio';
import Products from '../../components/products/Products';
import Hero from '../../components/Layout/Hero';
import { PlanMotionContext } from '../../services/planMotion';
import { PortfolioConfig } from '../../models/PortfolioConfig';
import { PortfolioItem } from '../../models/PortfolioItem';
import { HeroConfig } from '../../models/HeroConfig';
import { DesignConfig, type HeroLayout, type PortfolioLayout, type ProductsLayout } from '../../models/DesignConfig';
import type { Product } from '../../models/Product';
import { Social } from '../../models/Social';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { SiteNavContext } from '../../services/siteNav';
import { ProductInquiryContext } from '../../services/productAction';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, o?: { name?: string }) => o?.name ?? k, language: 'he' }),
}));
// The visitor asked for nothing: whatever holds still here, the plan held.
vi.mock('../../hooks/useA11yPrefs', () => ({ useStill: () => false }));
vi.mock('../../utils/cutout', async (orig) => ({ ...(await orig<typeof import('../../utils/cutout')>()), useCutout: () => false }));
vi.mock('../../components/Layout/vantaDeps', () => ({ loadVantaDeps: vi.fn(() => new Promise(() => {})) }));
// The two backdrops draw on a canvas; here they only say whether they were told to hold still.
vi.mock('../../components/Layout/heroes/SonarField', () => ({
  default: ({ still }: { still: boolean }) => <i data-testid="sonar" data-still={String(still)} />,
}));
vi.mock('../../components/Layout/heroes/MetalRibbons', () => ({
  default: ({ still }: { still: boolean }) => <i data-testid="metal" data-still={String(still)} />,
  metalTint: () => [0, 0, 0],
}));

// Every observer on the page hears that it came into view.
let seen: IntersectionObserverCallback[] = [];
const intersect = (visible: boolean) => seen.forEach((cb) => cb([{ isIntersecting: visible } as IntersectionObserverEntry], {} as IntersectionObserver));
class Observer {
  constructor(cb: IntersectionObserverCallback) { seen.push(cb); }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
class Sizes {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  seen = [];
  vi.stubGlobal('IntersectionObserver', Observer);
  vi.stubGlobal('ResizeObserver', Sizes);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const onPlan = (motion: boolean, ui: React.ReactElement) => <PlanMotionContext.Provider value={motion}>{ui}</PlanMotionContext.Provider>;

/** Whether anything on it changed by itself over the time it takes to turn twice. */
const turnsByItself = async (ui: React.ReactElement, ms: number) => {
  vi.useFakeTimers();
  seen = [];
  const { container, unmount } = render(ui);
  act(() => intersect(true));
  const before = container.innerHTML;
  for (let i = 0; i < 3; i++) await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  const after = container.innerHTML;
  unmount();
  vi.useRealTimers();
  return before !== after;
};

describe('the server says whether the site moves (LT-570)', () => {
  it('moves when it says nothing, as the register preview and older payloads do', () => {
    expect(WebsiteConfig.fromJSON(RAW_AI_RESPONSE_SHAPE).motion).toBe(true);
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, motion: false }).motion).toBe(false);
  });
});

describe('the galleries on a plan without motion', () => {
  const items = (n: number) => Array.from({ length: n }, (_, i) => new PortfolioItem(`https://example.com/${i + 1}.jpg`, `עבודה ${i + 1}`, `תיאור ${i + 1}`, `תמונה ${i + 1}`));
  const gallery = (layout: PortfolioLayout, n = 4) => <Portfolio config={new PortfolioConfig(true, 'גלריה', 'העבודות שלנו', items(n))} layout={layout} />;

  it.each(['clothesline', 'cascade'] as const)('%s turns on a paid plan and holds still without motion', async (layout) => {
    expect(await turnsByItself(onPlan(true, gallery(layout)), 2600)).toBe(true);
    expect(await turnsByItself(onPlan(false, gallery(layout)), 2600)).toBe(false);
  });

  it.each(['clothesline', 'cascade'] as const)('%s keeps its own look and every picture, to move by hand', (layout) => {
    render(onPlan(false, gallery(layout)));
    for (const n of [1, 2, 3, 4]) expect(screen.getAllByAltText(`תמונה ${n}`, { hidden: true } as never).length).toBe(1);
    expect(screen.getByLabelText('portfolio.slideshow_next')).toBeInTheDocument();
  });

  it('draws the curve as a masonry, every picture in view', () => {
    const { container } = render(onPlan(false, gallery('curve', 5)));
    expect(container.querySelector('.lt-curve')).toBeNull();
    expect(container.querySelector('.columns-1')).not.toBeNull();
    for (let i = 1; i <= 5; i++) expect(screen.getByAltText(`תמונה ${i}`)).toBeTruthy();
  });

  it('keeps the curve on a paid plan', () => {
    const { container } = render(onPlan(true, gallery('curve', 5)));
    expect(container.querySelector('.lt-curve')).not.toBeNull();
    expect(container.querySelector('.lt-curve')).not.toHaveAttribute('data-still');
  });
});

describe('the products on a plan without motion', () => {
  const product = (i: number): Product => ({ id: `id${i}`, slug: `p-${i}`, name: `Product ${i}`, price: 12000 + i * 100, images: [{ url: `a${i}.webp` }], details: [] });
  const shelf = (layout: ProductsLayout) => (
    <SiteNavContext.Provider value={{ atHome: true, go: vi.fn() }}>
      <ProductInquiryContext.Provider value={{ inquiry: null, setInquiry: vi.fn() }}>
        <Products summary={{ total: 6, pages: true, items: Array.from({ length: 6 }, (_, i) => product(i)) }} layout={layout} />
      </ProductInquiryContext.Provider>
    </SiteNavContext.Provider>
  );

  const beltPlays = (motion: boolean) => {
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(390);
    const play = vi.fn();
    const proto = Element.prototype as unknown as { animate?: unknown };
    const original = proto.animate;
    proto.animate = () => ({ pause: vi.fn(), play, cancel: vi.fn(), currentTime: 0 });
    try {
      render(onPlan(motion, shelf('belt')));
    } finally {
      // jsdom has none: left as undefined, framer-motion would take it for the browser's own.
      if (original) proto.animate = original;
      else delete proto.animate;
    }
    return play.mock.calls.length > 0;
  };

  it('runs the belt on a paid plan and stands its plates still without motion', () => {
    expect(beltPlays(true)).toBe(true);
    expect(beltPlays(false)).toBe(false);
  });

  it.each([['hanger', 4500], ['coverflow', 4500]] as const)('%s turns on a paid plan and holds still without motion', async (layout, ms) => {
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(390);
    expect(await turnsByItself(onPlan(true, shelf(layout)), ms)).toBe(true);
    expect(await turnsByItself(onPlan(false, shelf(layout)), ms)).toBe(false);
  });

  it.each(['belt', 'hanger', 'coverflow'] as const)('%s stays the %s, every product still a link', (layout) => {
    render(onPlan(false, shelf(layout)));
    expect(screen.getByTestId(`products-${layout}`)).toBeTruthy();
    expect(document.querySelector('a[href="/products/p-5"]')).toBeTruthy();
  });
});

describe('the heroes and backdrops on a plan without motion', () => {
  const config = () => ({ ...new HeroConfig(true, 'סטודיו נועה', 'טיפוח מדויק', 'סטודיו ביתי ברמת גן', 'hero.jpg', 'gradient', 'round', 'אפייה טרייה מדי בוקר', 'קביעת תור') });
  const hero = (heroLayout: HeroLayout, decor?: 'sonar' | 'metal') => (
    <MemoryRouter>
      <Hero
        config={config() as HeroConfig}
        social={Social.fromJSON({})}
        phone={null}
        isContactVisible
        businessName="נועה"
        appointmentTypes={[]}
        design={DesignConfig.fromJSON({ heroLayout, decor })}
        jitter={{ posterAlt: true, flipPosterSplit: false, decorStart: false }}
      />
    </MemoryRouter>
  );

  it('opens the expand hero\'s picture from the start, with no tall box to scroll through', () => {
    const paid = render(onPlan(true, hero('expand')));
    expect(paid.container.querySelector('[style*="200vh"]')).not.toBeNull();
    paid.unmount();
    const { container } = render(onPlan(false, hero('expand')));
    expect(container.querySelector('[style*="200vh"]')).toBeNull();
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('scrolls the parallax hero as one piece', () => {
    const add = vi.spyOn(window, 'addEventListener');
    render(onPlan(false, hero('parallax')));
    expect(add.mock.calls.filter(([type]) => type === 'scroll')).toEqual([]);
    render(onPlan(true, hero('parallax')));
    expect(add.mock.calls.filter(([type]) => type === 'scroll')).not.toEqual([]);
  });

  it.each(['sonar', 'metal'] as const)('holds the %s backdrop still, and lets it move on a paid plan', async (decor) => {
    const free = render(onPlan(false, hero('poster-statement', decor)));
    expect((await free.findByTestId(decor)).dataset.still).toBe('true');
    free.unmount();
    const paid = render(onPlan(true, hero('poster-statement', decor)));
    expect((await paid.findByTestId(decor)).dataset.still).toBe('false');
  });
});

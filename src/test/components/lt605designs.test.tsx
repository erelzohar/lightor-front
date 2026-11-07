import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MeshHero, { meshColors, ringText, spotsAt } from '../../components/Layout/heroes/MeshHero';
import SplashButton, { lettersOf } from '../../components/ui/SplashButton';
import ProductWall, { shelvesOf } from '../../components/products/ProductWall';
import ProductStand from '../../components/products/ProductStand';
import ProductStage, { poolOf, washOf, wordSize } from '../../components/products/ProductStage';
import ProductPage from '../../components/products/ProductPage';
import ProductsPage from '../../components/products/ProductsPage';
import { HeroConfig } from '../../models/HeroConfig';
import { Palette } from '../../models/WebsiteConfig';
import type { Product } from '../../models/Product';
import { SiteNavContext } from '../../services/siteNav';
import { ProductInquiryContext } from '../../services/productAction';
import { comingBack, liftBack, liftTo, wayBack } from '../../services/productLift';
import { cardOf, forgetCards, lastList, rememberCards } from '../../services/productCards';
import { withoutPaidDesigns } from '../../services/paidDesigns';
import WebConfigService from '../../services/WebConfigService';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), language: 'he' }),
}));
vi.mock('../../components/NotFound', () => ({ default: () => <p>not found</p> }));

const product = (i: number, extra: Partial<Product> = {}): Product => ({
  id: `id${i}`, slug: `p-${i}`, name: `Product ${i}`, price: 1000 + i * 1000, images: [{ url: `https://x/a${i}.jpg` }, { url: `https://x/b${i}.jpg` }], details: [], ...extra,
});
const hero = (extra: Partial<HeroConfig> = {}) => Object.assign(
  HeroConfig.fromJSON({ visible: true, title: 'מסיבות שזוכרים', subtitle: 'הפקת אירועים', description: 'ימי הולדת לילדים', heroImageSrc: 'hero.jpg', stamp: 'מאז 2010' }),
  extra,
);
const palette = Palette.fromJSON({ colorPrimary: '#e0475b', colorPrimaryDark: '#ff6b7f', colorLightBg: '#fdf6ec', colorDarkBg: '#121212' });

afterEach(() => { forgetCards(); vi.restoreAllMocks(); });

describe("festive's mesh hero (LT-605)", () => {
  it('draws the words, the buttons and the seal from the owner\'s own content', () => {
    render(<MeshHero config={hero()} businessName="Party Time" palette={palette} dark={false} still={false} actions={<a href="#schedule">book</a>} noTrack={false} />);
    const root = screen.getByTestId('hero-mesh');
    expect(within(root).getByRole('heading', { level: 1 }).textContent).toContain('מסיבות שזוכרים');
    expect(within(root).getByRole('heading', { level: 1 }).textContent).toContain('הפקת אירועים');
    expect(root.textContent).toContain('ימי הולדת לילדים');
    expect(root.textContent).toContain('מאז 2010');
    expect(within(root).getByRole('link', { name: 'book' })).toBeTruthy();
    // The seal: the name round the ring, the hero's picture inside it.
    const seal = screen.getByTestId('mesh-seal');
    expect(seal.getAttribute('aria-hidden')).toBe('true');
    expect(seal.textContent).toContain('Party Time');
    expect(seal.querySelector('img')?.getAttribute('src')).toContain('hero.jpg');
  });

  it('stands on the still CSS field where there is no WebGL (and never throws)', () => {
    render(<MeshHero config={hero()} businessName="X" palette={palette} dark still actions={null} noTrack={false} />);
    const root = screen.getByTestId('hero-mesh');
    expect(root.style.background).toContain('radial-gradient');
    expect(root.getAttribute('data-asleep')).toBe('true');
  });

  it('takes its colours from the site: the page background, the main colour and its partner', () => {
    const light = meshColors(palette, false);
    const dark = meshColors(palette, true);
    expect(light).toHaveLength(6);
    expect(light[0].map((v) => Math.round(v * 255))).toEqual([0xfd, 0xf6, 0xec]);
    expect(dark[0].map((v) => Math.round(v * 255))).toEqual([0x12, 0x12, 0x12]);
    expect(dark[1].map((v) => Math.round(v * 255))).toEqual([0xff, 0x6b, 0x7f]);
    // No palette: still six colours, nothing undefined.
    expect(meshColors(undefined, false).flat().every((v) => Number.isFinite(v))).toBe(true);
  });

  it('repeats the name to go once round the ring, and moves its spots within the fold', () => {
    expect(ringText('')).toBe('');
    expect(ringText('A very long business name for the ring')).toBe('A very long business name for the ring • ');
    expect(ringText('Gal').split('•').length - 1).toBe(4);
    for (const t of [0, 10, 1000]) for (const v of spotsAt(t)) expect(Math.abs(v)).toBeLessThanOrEqual(0.5);
  });

  it('is a paid design: the free plan gets the full image instead', () => {
    expect(withoutPaidDesigns({ design: { heroLayout: 'mesh' }, blocks: [{ type: 'hero', variant: 'mesh' }] })).toEqual({
      design: { heroLayout: 'fullbleed' }, blocks: [{ type: 'hero', variant: 'fullbleed' }],
    });
  });
});

describe("festive's splash button (LT-605)", () => {
  it('names itself by the owner\'s words, its letters rolling in two rows of the same words', () => {
    render(<SplashButton href="#schedule" label="קביעת תור" />);
    const button = screen.getByRole('link', { name: 'קביעת תור' });
    expect(button.getAttribute('href')).toBe('#schedule');
    const rows = button.querySelectorAll('.lt-splash-word');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toBe('קביעת תור');
    expect(rows[1].textContent).toBe('קביעת תור');
    expect(rows[0].querySelectorAll('span')).toHaveLength('קביעת תור'.length);
    expect(button.querySelectorAll('.lt-splash-burst path')).toHaveLength(12);
  });

  it('keeps the words whole when still (the editor can reach them) and for joined scripts', () => {
    const { unmount } = render(<SplashButton href="#x" label="Book" still labelAttrs={{ 'data-lt-edit': 'components.hero.cta' }} />);
    const button = screen.getByRole('link', { name: 'Book' });
    expect(button.getAttribute('data-still')).toBe('true');
    expect(button.querySelector('[data-lt-edit]')?.textContent).toBe('Book');
    unmount();
    render(<SplashButton href="#x" label="احجز الآن" joined />);
    expect(screen.getByRole('link', { name: 'احجز الآن' }).querySelectorAll('.lt-splash-word')).toHaveLength(0);
  });

  it('cuts letters, not the marks or the emoji they carry', () => {
    expect(lettersOf('שָׁלוֹם')).toHaveLength(4);
    expect(lettersOf('Hi 👋')).toEqual(['H', 'i', ' ', '👋']);
  });
});

const nav = (go = vi.fn()) => ({ atHome: true, go });

describe("gallery's wall of shelves (LT-605)", () => {
  it('stands the products on shelves of four, a short shelf centred, each name and price under it', () => {
    expect(shelvesOf([1, 2, 3, 4, 5, 6], 4)).toEqual([[1, 2, 3, 4], [5, 6]]);
    render(<SiteNavContext.Provider value={nav()}><ProductWall items={[0, 1, 2, 3, 4].map((i) => product(i))} pages currency="ILS" /></SiteNavContext.Provider>);
    const shelves = screen.getAllByTestId('wall-shelf');
    // jsdom has no media queries: the narrowest wall, two to a shelf.
    expect(shelves).toHaveLength(3);
    const links = screen.getAllByTestId('wall-product');
    expect(links[0].getAttribute('href')).toBe('/products/p-0');
    expect(links[0].getAttribute('aria-label')).toBe('Product 0, ₪10');
    expect(shelves[0].textContent).toContain('Product 1');
    expect(shelves[2].querySelectorAll('[data-testid="wall-product"]')).toHaveLength(1);
  });

  it('carries the product to its page, and keeps the card for the page to draw at once', () => {
    const go = vi.fn();
    render(<SiteNavContext.Provider value={nav(go)}><ProductWall items={[product(0), product(1)]} pages /></SiteNavContext.Provider>);
    expect(cardOf('p-1')?.name).toBe('Product 1');
    fireEvent.click(screen.getAllByTestId('wall-product')[1]);
    expect(go).toHaveBeenCalledWith('/products/p-1');
    expect(wayBack('p-1', '/products')).toBe('/');
  });

  it('asks about the product in the form where products have no pages', () => {
    const setInquiry = vi.fn();
    const go = vi.fn();
    render(
      <ProductInquiryContext.Provider value={{ inquiry: null, setInquiry }}>
        <SiteNavContext.Provider value={nav(go)}><ProductWall items={[product(0), product(1)]} pages={false} /></SiteNavContext.Provider>
      </ProductInquiryContext.Provider>,
    );
    const first = screen.getAllByTestId('wall-product')[0];
    expect(first.getAttribute('href')).toBe('#contact');
    fireEvent.click(first);
    expect(go).not.toHaveBeenCalled();
    expect(setInquiry).toHaveBeenCalledWith({ id: 'id0', name: 'Product 0' });
  });

  it('draws the products page as walls, one per category', () => {
    render(
      <MemoryRouter initialEntries={['/products']}>
        <SiteNavContext.Provider value={nav()}>
          <ProductsPage businessName="Shop" drafts={[product(0, { category: 'A' }), product(1, { category: 'B' }), product(2, { category: 'A' })]} layout="wall" />
        </SiteNavContext.Provider>
      </MemoryRouter>,
    );
    const sections = screen.getAllByTestId('products-category');
    expect(sections.map((s) => s.querySelector('h2')?.textContent)).toEqual(['A', 'B']);
    expect(within(sections[0]).getAllByTestId('wall-product')).toHaveLength(2);
  });
});

describe('the move between the wall and a product (LT-605)', () => {
  type VT = { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  const doc = document as unknown as VT;
  let names: string[] = [];
  beforeEach(() => {
    names = [];
    doc.startViewTransition = (cb) => {
      names = Array.from(document.querySelectorAll<HTMLElement>('*')).map((el) => el.style.getPropertyValue('view-transition-name')).filter(Boolean);
      cb();
      return { finished: Promise.resolve() };
    };
  });
  afterEach(() => { delete doc.startViewTransition; });

  it('names the tapped picture for the length of the move, then the page changes', () => {
    const go = vi.fn();
    const el = document.createElement('span');
    document.body.appendChild(el);
    liftTo(el, 'p-1', '/products/p-1', go, false);
    expect(names).toEqual(['lt-product']);
    expect(el.style.getPropertyValue('view-transition-name')).toBe('');
    expect(go).toHaveBeenCalledWith('/products/p-1');
    el.remove();
  });

  it('just changes the page with less motion asked for, or without the browser API', () => {
    const go = vi.fn();
    const el = document.createElement('span');
    liftTo(el, 'p-1', '/products/p-1', go, true);
    expect(names).toEqual([]);
    expect(go).toHaveBeenCalledTimes(1);
    delete doc.startViewTransition;
    liftTo(el, 'p-1', '/products/p-1', go, false);
    expect(go).toHaveBeenCalledTimes(2);
  });

  it('back to the wall: the product\'s place is the end of the move, at the scroll it was left at', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const go = vi.fn();
    Object.defineProperty(window, 'scrollY', { value: 640, configurable: true });
    liftTo(document.createElement('span'), 'p-2', '/products/p-2', go, false);
    let during = false;
    go.mockImplementation(() => { during = comingBack('p-2'); });
    liftBack('p-2', wayBack('p-2', '/products'), go, false);
    expect(go).toHaveBeenLastCalledWith('/');
    expect(during).toBe(true);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 640, behavior: 'instant' });
    await Promise.resolve();
    await Promise.resolve();
    expect(comingBack('p-2')).toBe(false);
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });
});

const lookProps = (p: Product, extra: Record<string, unknown> = {}) => ({
  product: p, currency: 'ILS', phone: '0501234567', cta: undefined as string | undefined, choice: {}, onChoice: vi.fn(), businessName: 'Shop',
  logo: undefined as string | undefined, listTitle: undefined as string | undefined, share: vi.fn(), copied: false,
  actionsRef: { current: null as HTMLDivElement | null }, ...extra,
});

describe("gallery's product on its ledge (LT-605)", () => {
  const shirt = product(7, { category: 'חולצות', summary: 'כותנה רכה', description: 'נתפרה ביד', sizes: ['S', 'M'], colors: [{ name: 'לבן', hex: '#ffffff' }], details: ['100% כותנה'] });

  it('draws the words beside the product, sizes as cards and the details open', () => {
    const onChoice = vi.fn();
    render(<SiteNavContext.Provider value={nav()}><ProductStand {...lookProps(shirt, { onChoice })} /></SiteNavContext.Provider>);
    const stand = screen.getByTestId('product-stand');
    expect(within(stand).getByRole('heading', { level: 1 }).textContent).toBe('Product 7');
    expect(stand.textContent).toContain('כותנה רכה');
    expect(stand.textContent).toContain('נתפרה ביד');
    fireEvent.click(screen.getByRole('radio', { name: 'M' }));
    expect(onChoice).toHaveBeenCalledWith({ size: 'M' });
    fireEvent.click(screen.getByRole('radio', { name: 'לבן' }));
    expect(onChoice).toHaveBeenLastCalledWith({ color: 'לבן' });
    expect(screen.getByText('100% כותנה')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'products.detailsTitle' }));
    expect(screen.queryByText('100% כותנה')).toBeNull();
    // Its picture wears the move's name, and the way back leads to the products.
    expect(stand.querySelector<HTMLElement>('[style*="view-transition-name"]')).toBeTruthy();
    expect(within(stand).getAllByRole('link')[0].getAttribute('href')).toBe('/products');
  });

  it('swipes to the next picture, and the dots go to any', () => {
    render(<SiteNavContext.Provider value={nav()}><ProductStand {...lookProps(shirt)} /></SiteNavContext.Provider>);
    const dots = within(screen.getByRole('group', { name: 'products.pictures' })).getAllByRole('button');
    expect(dots[0].getAttribute('aria-current')).toBe('true');
    fireEvent.click(dots[1]);
    expect(dots[1].getAttribute('aria-current')).toBe('true');
  });
});

describe("electric's stage (LT-605)", () => {
  const shoe = product(3, { category: 'נעלי ריצה', sizes: ['40', '41'], colors: [{ name: 'Cloud', hex: '#e4e4e4' }, { name: 'Cobalt', hex: '#2f4fd0' }], images: [1, 2, 3, 4, 5].map((n) => ({ url: `https://x/s${n}.jpg` })) });

  it('puts the colour\'s name behind the product and washes the stage in it', () => {
    const onChoice = vi.fn();
    const { rerender } = render(<SiteNavContext.Provider value={nav()}><ProductStage {...lookProps(shoe, { onChoice })} /></SiteNavContext.Provider>);
    expect(screen.getByTestId('stage').textContent).toContain('נעלי ריצה');
    fireEvent.click(screen.getByRole('button', { name: 'Cobalt' }));
    expect(onChoice).toHaveBeenCalledWith({ color: 'Cobalt' });
    rerender(<SiteNavContext.Provider value={nav()}><ProductStage {...lookProps(shoe, { onChoice, choice: { color: 'Cobalt' } })} /></SiteNavContext.Provider>);
    expect(screen.getByTestId('stage').textContent).toContain('Cobalt');
    expect(screen.getByRole('button', { name: 'Cobalt' }).getAttribute('aria-pressed')).toBe('true');
    // The tint over the look and the pool on the stage: the picked colour's alone.
    const washes = screen.getByTestId('product-stage').querySelectorAll('.lt-stage-wash[data-on]');
    expect(washes).toHaveLength(2);
    for (const w of washes) expect((w as HTMLElement).style.background).toContain('47, 79, 208');
  });

  it('opens its pictures in a viewer: thumbnails, "+2", arrows and Escape', () => {
    render(<SiteNavContext.Provider value={nav()}><ProductStage {...lookProps(shoe)} /></SiteNavContext.Provider>);
    fireEvent.click(screen.getByRole('button', { name: 'products.pictures' }));
    const viewer = screen.getByTestId('stage-viewer');
    expect(viewer.textContent).toContain('4 / 5');
    fireEvent.click(within(viewer).getByRole('button', { name: 'products.next' }));
    expect(viewer.textContent).toContain('5 / 5');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('stage-viewer')).toBeNull();
  });

  it('sizes toggle, the price reads plainly, and nothing it shows was invented', () => {
    const onChoice = vi.fn();
    render(<SiteNavContext.Provider value={nav()}><ProductStage {...lookProps(shoe, { onChoice })} /></SiteNavContext.Provider>);
    fireEvent.click(screen.getByRole('button', { name: '41' }));
    expect(onChoice).toHaveBeenCalledWith({ size: '41' });
    const stage = screen.getByTestId('product-stage');
    expect(stage.textContent).toContain('₪40');
    expect(stage.textContent).not.toMatch(/review|rating|stock/i);
  });

  it('the colour wash and the huge word stay within reason', () => {
    expect(washOf('#2f4fd0')).toBe('rgba(47, 79, 208, 0.15)');
    expect(poolOf('#2f4fd0')).toContain('rgba(47, 79, 208, 0.45)');
    expect(wordSize(600, 'Cloud')).toBeGreaterThan(wordSize(600, 'A much longer colour name'));
    expect(wordSize(10, 'x')).toBe(32);
    expect(wordSize(5000, 'x')).toBe(150);
  });

  it('is a paid design: the free plan gets the pictures beside the words', () => {
    expect(withoutPaidDesigns({ design: { productPageLayout: 'stage' } }).design).toEqual({ productPageLayout: 'side' });
    expect(withoutPaidDesigns({ design: { productPageLayout: 'stand' } }).design).toEqual({ productPageLayout: 'stand' });
  });
});

describe('a product page from the wall draws at once (LT-605)', () => {
  it('from the tapped card, then fills in the rest', async () => {
    rememberCards([product(5, { summary: 'from the card' })]);
    let resolve: (loaded: { product: Product; related: Product[] }) => void = () => undefined;
    vi.spyOn(WebConfigService.getInstance(), 'getProduct').mockReturnValue(new Promise((r) => { resolve = r as never; }) as never);
    render(
      <MemoryRouter initialEntries={['/products/p-5']}>
        <SiteNavContext.Provider value={nav()}>
          <ProductPage slug="p-5" businessName="Shop" layout="stand" />
        </SiteNavContext.Provider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Product 5');
    expect(screen.getByTestId('product-stand').textContent).toContain('from the card');
    await act(async () => { resolve({ product: { ...product(5), description: 'the whole story', details: ['handmade'] }, related: [] }); });
    expect(screen.getByTestId('product-stand').textContent).toContain('the whole story');
    expect(screen.getByText('handmade')).toBeTruthy();
  });

  it('keeps the list of products for the way back', () => {
    expect(lastList()).toBeNull();
  });
});

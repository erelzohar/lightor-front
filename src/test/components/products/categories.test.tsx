import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Products from '../../../components/products/Products';
import ProductsPage from '../../../components/products/ProductsPage';
import ProductPage from '../../../components/products/ProductPage';
import { WellTiles } from '../../../components/products/ProductTiles';
import { matches, sorted } from '../../../components/products/ProductShop';
import FeatureStack, { MASKS, scatter } from '../../../components/Layout/FeatureStack';
import { groupsOf, parseProduct, type Product } from '../../../models/Product';
import { ProductInquiryContext, choiceText, rememberChoice, takeChoice } from '../../../services/productAction';
import { SiteNavContext } from '../../../services/siteNav';
import { withoutPaidDesigns } from '../../../services/paidDesigns';

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), language: 'he' }),
}));
vi.mock('../../../components/NotFound', () => ({ default: () => <p>not found</p> }));

const product = (i: number, extra: Partial<Product> = {}): Product => ({
  id: `id${i}`, slug: `p-${i}`, name: `Product ${i}`, price: 1000 + i * 1000, images: [{ url: `a${i}.webp` }, { url: `b${i}.webp` }], details: [], ...extra,
});
// The wizard's sample products: a page draws them without asking a server.
const draft = (i: number, extra: Partial<Product> = {}) => product(i, { id: `draft-${i}`, slug: `draft-${i}`, ...extra });
const shelf = [
  draft(0, { category: 'טבעות' }), draft(1, { category: 'שרשראות' }), draft(2, { category: 'טבעות' }), draft(3), draft(4, { category: 'שרשראות', soldOut: true }),
];

const page = (layout?: string, path = '/products') => render(
  <MemoryRouter initialEntries={[path]}>
    <SiteNavContext.Provider value={{ atHome: false, go: vi.fn() }}>
      <ProductsPage businessName="Shop" drafts={shelf} layout={layout as never} />
    </SiteNavContext.Provider>
  </MemoryRouter>
);

describe('the products page by category (LT-587)', () => {
  it('groups by category in the order they appear, the products with none last', () => {
    const groups = groupsOf(shelf);
    expect(groups.map((g) => [g.name, g.items.map((p) => p.id)])).toEqual([
      ['טבעות', ['draft-0', 'draft-2']],
      ['שרשראות', ['draft-1', 'draft-4']],
      ['', ['draft-3']],
    ]);
    expect(groupsOf([draft(0, { category: 'A' }), draft(1)])).toHaveLength(1);
  });

  it('draws each category as a section with its name, and links that jump to them', () => {
    page();
    const sections = screen.getAllByTestId('products-category');
    expect(sections).toHaveLength(3);
    expect(within(sections[0]).getByRole('heading', { level: 2 }).textContent).toBe('טבעות');
    expect(within(sections[0]).getByText('Product 2')).toBeTruthy();
    expect(within(sections[2]).getByRole('heading', { level: 2 }).textContent).toBe('products.uncategorized');
    const jumps = within(screen.getByRole('navigation', { name: 'products.categories' })).getAllByRole('link');
    expect(jumps.map((a) => a.getAttribute('href'))).toEqual(['#products-cat-0', '#products-cat-1', '#products-cat-2']);
  });

  it('keeps one grid for a catalogue of one category', () => {
    render(
      <MemoryRouter initialEntries={['/products']}>
        <ProductsPage businessName="Shop" drafts={[draft(0, { category: 'A' }), draft(1, { category: 'A' })]} />
      </MemoryRouter>
    );
    expect(screen.queryAllByTestId('products-category')).toHaveLength(0);
    expect(screen.getByTestId('products-well')).toBeTruthy();
  });

  it('rows and shelves: a sideways row or a card of its own for each category', () => {
    const { unmount } = page('rows');
    expect(screen.getAllByTestId('products-row').map((r) => r.querySelector('h2')?.textContent)).toEqual(['טבעות', 'שרשראות', 'products.uncategorized']);
    unmount();
    page('shelves');
    const shelves = screen.getAllByTestId('products-shelf');
    expect(shelves).toHaveLength(3);
    expect(within(shelves[1]).getByText('products.count:{"count":2}')).toBeTruthy();
  });

  it('the shop: filters by category with how many each holds, and opens at the one a product page asked for', () => {
    page('shop', '/products?category=%D7%A9%D7%A8%D7%A9%D7%A8%D7%90%D7%95%D7%AA');
    const shop = screen.getByTestId('products-shop');
    // Opened at the chains: two of them.
    expect(within(shop).getByText('products.results:{"count":2}')).toBeTruthy();
    const rings = within(shop).getAllByRole('checkbox', { name: /טבעות/ })[0];
    fireEvent.click(rings);
    expect(within(shop).getByText('products.results:{"count":4}')).toBeTruthy();
    fireEvent.click(within(shop).getAllByText('products.clearAll')[0]);
    expect(within(shop).getByText('products.results:{"count":5}')).toBeTruthy();
  });

  it('the shop filters by colour, size, stock and price, and sorts by price with the unpriced last', () => {
    const shirt = product(1, { colors: [{ name: 'אדום', hex: '#cc2233' }], sizes: ['M'] });
    const none = { categories: [], colors: [], sizes: [], inStock: false, min: null, max: null };
    expect(matches(shirt, { ...none, colors: ['אדום'] })).toBe(true);
    expect(matches(shirt, { ...none, colors: ['כחול'] })).toBe(false);
    expect(matches(shirt, { ...none, sizes: ['L'] })).toBe(false);
    expect(matches(product(2, { soldOut: true }), { ...none, inStock: true })).toBe(false);
    expect(matches(product(2), { ...none, min: 25, max: 35 })).toBe(true);
    expect(matches(product(2), { ...none, max: 20 })).toBe(false);
    const items = [product(3), product(1, { price: undefined }), product(1)];
    expect(sorted(items, 'priceUp').map((p) => p.price)).toEqual([2000, 4000, undefined]);
    expect(sorted(items, 'priceDown').map((p) => p.price)).toEqual([4000, 2000, undefined]);
  });
});

describe('colours and sizes (LT-588)', () => {
  it('reads what a product comes in, dropping what is no colour', () => {
    const parsed = parseProduct({ id: 'a', slug: 's', name: 'N', images: [], colors: [{ name: 'אדום', hex: '#cc2233' }, { name: 'bad', hex: 'red' }], sizes: ['M', '', 3] });
    expect(parsed?.colors).toEqual([{ name: 'אדום', hex: '#cc2233' }]);
    expect(parsed?.sizes).toEqual(['M']);
    expect(parseProduct({ id: 'a', slug: 's', name: 'N', images: [] })?.colors).toBeUndefined();
  });

  it('the options card: the visitor picks, and the button takes the pick to the form', () => {
    const setInquiry = vi.fn();
    render(
      <SiteNavContext.Provider value={{ atHome: true, go: vi.fn() }}>
        <ProductInquiryContext.Provider value={{ inquiry: null, setInquiry }}>
          <WellTiles items={[product(1, { colors: [{ name: 'אדום', hex: '#cc2233' }, { name: 'שחור', hex: '#111111' }], sizes: ['S', 'M'] })]} pages={false} card="options" />
        </ProductInquiryContext.Provider>
      </SiteNavContext.Provider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'שחור' }));
    fireEvent.click(screen.getByRole('button', { name: 'M' }));
    expect(screen.getByRole('button', { name: 'שחור' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByText('products.cta').closest('a') as HTMLAnchorElement);
    expect(setInquiry).toHaveBeenCalledWith({ id: 'id1', name: 'Product 1', choice: { color: 'שחור', size: 'M' } });
  });

  it('keeps a pick for the product page it leads to, once', () => {
    rememberChoice('x', { color: 'אדום' });
    expect(takeChoice('x')).toEqual({ color: 'אדום' });
    expect(takeChoice('x')).toBeUndefined();
    expect(choiceText({ color: 'אדום', size: 'M' })).toBe('אדום, M');
    expect(choiceText(undefined)).toBe('');
  });

  it('the reveal card holds its details and buttons over the card, out of the main link', () => {
    render(<WellTiles items={[product(1, { summary: 'Made by hand' })]} pages card="reveal" />);
    const card = document.querySelector('[data-card-look="reveal"]') as HTMLElement;
    expect(within(card).getByText('Made by hand')).toBeTruthy();
    const more = within(card).getByText('products.more').closest('a') as HTMLAnchorElement;
    expect(more.getAttribute('href')).toBe('/products/p-1');
    expect(more.parentElement?.closest('a')).toBeNull();
  });
});

describe("a product's 'detail' page (LT-588)", () => {
  afterEach(() => { document.getElementById('lightor-page')?.remove(); });

  it('one picture with dots, the tags, the business and the way to more of its category; the pick goes to the form', () => {
    const script = document.createElement('script');
    script.id = 'lightor-page';
    script.type = 'application/json';
    script.textContent = JSON.stringify({ kind: 'product', data: { product: product(1, { category: 'טבעות', details: ['כסף 925'], images: [{ url: 'a.webp' }, { url: 'b.webp' }], sizes: ['S', 'M'] }), related: [] } });
    document.body.appendChild(script);
    const setInquiry = vi.fn();
    render(
      <MemoryRouter initialEntries={['/products/p-1']}>
        <SiteNavContext.Provider value={{ atHome: false, go: vi.fn() }}>
          <ProductInquiryContext.Provider value={{ inquiry: null, setInquiry }}>
            <ProductPage slug="p-1" businessName="Shop" layout="detail" />
          </ProductInquiryContext.Provider>
        </SiteNavContext.Provider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Product 1');
    expect(screen.getByText('כסף 925')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /products\.picture/ })).toHaveLength(2);
    expect(screen.getByText('products.moreOf:{"category":"טבעות"}').closest('a')?.getAttribute('href')).toBe('/products?category=%D7%98%D7%91%D7%A2%D7%95%D7%AA');
    expect(screen.getByText('products.allListings')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'M' }));
    fireEvent.click(screen.getByText('products.cta').closest('a') as HTMLAnchorElement);
    expect(setInquiry).toHaveBeenLastCalledWith({ id: 'id1', name: 'Product 1', choice: { size: 'M' } });
  });
});

describe('the home page drops card (LT-588)', () => {
  it('draws the products in a card with arrows, and calm tiles under three', () => {
    const { unmount } = render(<Products summary={{ total: 4, pages: true, items: [product(0), product(1), product(2), product(3)] }} layout="drops" />);
    expect(screen.getByTestId('products-drops')).toBeTruthy();
    expect(document.querySelector('a[href="/products/p-2"]')).toBeTruthy();
    unmount();
    render(<Products summary={{ total: 2, pages: true, items: [product(0), product(1)] }} layout="drops" />);
    expect(screen.queryByTestId('products-drops')).toBeNull();
  });
});

describe('the highlights that switch pictures (LT-588)', () => {
  const FEATURES = [{ title: 'Fresh', description: 'Every morning' }, { title: 'Local', description: 'From the area' }, { title: 'Fast', description: 'In minutes', image: 'own.webp' }];

  it('lists the highlights, shows the chosen one\'s words and its picture through a mask', () => {
    render(<FeatureStack features={FEATURES} pictures={['g1.webp', 'g2.webp']} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: /Fresh/ }).getAttribute('aria-pressed')).toBe('true');
    const tiles = () => Array.from(document.querySelectorAll('[data-tile] img')) as HTMLImageElement[];
    expect(tiles().length).toBe(MASKS[0].length);
    expect(tiles()[0].src).toContain('g1.webp');
    fireEvent.click(screen.getByRole('button', { name: /Fast/ }));
    expect(tiles().length).toBe(MASKS[2].length);
    expect(tiles()[0].src).toContain('own.webp');
  });

  it('moves on by itself in view, until touched', () => {
    vi.useFakeTimers();
    class Seen { constructor(private cb: IntersectionObserverCallback) {} observe() { this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver); } unobserve() {} disconnect() {} takeRecords(): IntersectionObserverEntry[] { return []; } }
    vi.stubGlobal('IntersectionObserver', Seen);
    try {
      render(<FeatureStack features={FEATURES} pictures={[]} />);
      act(() => { vi.advanceTimersByTime(4600); });
      expect(screen.getByRole('button', { name: /Local/ }).getAttribute('aria-pressed')).toBe('true');
      fireEvent.pointerDown(screen.getByTestId('features-stack'));
      act(() => { vi.advanceTimersByTime(20000); });
      expect(screen.getByRole('button', { name: /Local/ }).getAttribute('aria-pressed')).toBe('true');
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('scatters the pieces the same way for the same change', () => {
    expect(scatter(9, 2)).toEqual(scatter(9, 2));
    expect([...scatter(9, 2)].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('is a paid design: the free plan shows plain tiles', () => {
    const served = withoutPaidDesigns({ blocks: [{ type: 'features', variant: 'stack' }, { type: 'features', variant: 'orbs' }] });
    expect(served.blocks).toEqual([{ type: 'features', variant: 'tiles' }, { type: 'features', variant: 'orbs' }]);
  });
});

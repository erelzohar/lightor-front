import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Products, { tilesFor } from '../../../components/products/Products';
import ProductPage from '../../../components/products/ProductPage';
import ProductsPage from '../../../components/products/ProductsPage';
import { SwapTiles, WellTiles } from '../../../components/products/ProductTiles';
import { draftProducts, parseProducts, productPictures, productPrice, productsHavePage, categoriesOf, type Product } from '../../../models/Product';
import WebConfigService from '../../../services/WebConfigService';
import { ProductInquiryContext } from '../../../services/productAction';
import { SiteNavContext } from '../../../services/siteNav';
import { mainCta } from '../../../services/siteMode';
import { navLinksFromBlocks } from '../../../services/navLinks';

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), language: 'he' }),
}));
// Its entrance animation needs the browser's own animations, which jsdom has not.
vi.mock('../../../components/NotFound', () => ({ default: () => <p>not found</p> }));

const product = (i: number, extra: Partial<Product> = {}): Product => ({
  id: `id${i}`, slug: `p-${i}`, name: `Product ${i}`, price: 12000 + i * 100, images: [{ url: `a${i}.webp` }, { url: `b${i}.webp` }], details: [], ...extra,
});
const many = (n: number) => Array.from({ length: n }, (_, i) => product(i));

const draw = (ui: React.ReactElement, setInquiry = vi.fn(), go = vi.fn()) => {
  render(
    <SiteNavContext.Provider value={{ atHome: true, go }}>
      <ProductInquiryContext.Provider value={{ inquiry: null, setInquiry }}>{ui}</ProductInquiryContext.Provider>
    </SiteNavContext.Provider>
  );
  return { setInquiry, go };
};

describe('product prices', () => {
  it('reads minor units, showing cents only when there are some', () => {
    expect(productPrice(12000, 'ILS')).toBe('₪120');
    expect(productPrice(12050, 'USD')).toBe('$120.50');
    expect(productPrice(123456700, 'ILS')).toBe('₪1,234,567');
    expect(productPrice(undefined, 'ILS')).toBe('');
  });
});

describe('parsing', () => {
  it('drops what it cannot read and keeps the rest', () => {
    const parsed = parseProducts({ total: 3, pages: true, items: [{ id: 'a', slug: 's', name: 'N', images: [{ url: 'x.webp' }, { nope: 1 }] }, { id: 'b' }] });
    expect(parsed?.items).toHaveLength(1);
    expect(parsed?.items[0].images).toEqual([{ url: 'x.webp' }]);
    expect(parseProducts(null)).toBeUndefined();
  });

  it('keeps the categories in the order they first appear', () => {
    expect(categoriesOf([{ category: 'b' }, {}, { category: 'a' }, { category: 'b' }])).toEqual(['b', 'a']);
  });
});

describe('the section', () => {
  it('is not drawn with nothing to show', () => {
    const { container } = render(<Products summary={{ total: 0, pages: false, items: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  it('draws one product in full, the home page being its page', () => {
    draw(<Products summary={{ total: 1, pages: false, items: [product(0, { description: 'Long words', details: ['Fact'] })] }} phone="0501234567" currency="ILS" />);
    expect(screen.getByTestId('products-feature')).toBeTruthy();
    expect(screen.getByText('Long words')).toBeTruthy();
    expect(screen.getByText('Fact')).toBeTruthy();
    expect(screen.getByText('₪120')).toBeTruthy();
  });

  it('the main button of a single product opens the form with the product chosen', () => {
    const setInquiry = vi.fn();
    draw(<Products summary={{ total: 1, pages: false, items: [product(0)] }} />, setInquiry);
    fireEvent.click(screen.getByText('products.cta'));
    expect(setInquiry).toHaveBeenCalledWith({ id: 'id0', name: 'Product 0' });
  });

  it('uses the owner\'s words on the button when they wrote some', () => {
    draw(<Products summary={{ total: 1, pages: false, items: [product(0)] }} config={{ title: '', description: '', cta: 'Order now' }} />);
    expect(screen.getByText('Order now')).toBeTruthy();
  });

  it('offers WhatsApp with the product named, and no WhatsApp for a landline', () => {
    draw(<Products summary={{ total: 1, pages: false, items: [product(0)] }} phone="0501234567" />);
    const link = screen.getByText('products.whatsapp').closest('a') as HTMLAnchorElement;
    expect(link.href).toContain('wa.me/972501234567');
    expect(decodeURIComponent(link.href)).toContain('Product 0');
  });

  it('links each tile to the product\'s own page and stays in the app', () => {
    const go = vi.fn();
    draw(<Products summary={{ total: 2, pages: true, items: many(2) }} layout="well" />, vi.fn(), go);
    const link = screen.getByText('Product 1').closest('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/products/p-1');
    fireEvent.click(link);
    expect(go).toHaveBeenCalledWith('/products/p-1');
  });

  it('shows name and price without a hover, in every still layout', () => {
    for (const layout of ['well', 'swap', 'bento', 'list'] as const) {
      const { unmount } = render(<Products summary={{ total: 3, pages: true, items: many(3) }} layout={layout} currency="ILS" />);
      const section = within(document.body);
      expect(section.getByText('Product 2')).toBeTruthy();
      expect(section.getByText('₪122')).toBeTruthy();
      unmount();
    }
  });

  it('marks a sold-out product', () => {
    render(<Products summary={{ total: 2, pages: true, items: [product(0, { soldOut: true }), product(1)] }} />);
    expect(screen.getByText('products.soldOut')).toBeTruthy();
  });

  it('leads to the list whenever the site has one, in every layout (LT-542)', () => {
    for (const layout of ['well', 'swap', 'bento', 'list', 'belt', 'hanger', 'coverflow'] as const) {
      const go = vi.fn();
      const { unmount } = render(
        <SiteNavContext.Provider value={{ atHome: true, go }}>
          <Products summary={{ total: 6, pages: true, items: many(6) }} layout={layout} />
        </SiteNavContext.Provider>
      );
      const link = screen.getByText(/products\.all/).closest('a') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/products');
      expect(link.textContent).toContain('"count":6');
      fireEvent.click(link);
      expect(go).toHaveBeenCalledWith('/products');
      unmount();
    }
    render(<Products summary={{ total: 24, pages: true, items: many(8) }} />);
    expect(screen.getByText(/products\.all/).textContent).toContain('"count":24');
  });

  it('has no such link where products have no page (the free plan, a single product)', () => {
    const { unmount } = render(<Products summary={{ total: 1, pages: false, items: many(1) }} />);
    expect(screen.queryByText(/products\.all/)).toBeNull();
    unmount();
    render(<Products summary={{ total: 3, pages: false, items: many(3) }} />);
    expect(screen.queryByText(/products\.all/)).toBeNull();
  });

  it('falls back to calm tiles with too few for a moving layout', () => {
    expect(tilesFor('belt', 3)).toBe('well');
    expect(tilesFor('belt', 4)).toBe('belt');
    expect(tilesFor('hanger', 2)).toBe('well');
    expect(tilesFor('coverflow', 2)).toBe('well');
  });

  it.each(['belt', 'hanger', 'coverflow'] as const)('draws the %s, every product a link', (layout) => {
    draw(<Products summary={{ total: 6, pages: true, items: many(6) }} layout={layout} />);
    expect(screen.getByTestId(`products-${layout}`)).toBeTruthy();
    expect(document.querySelector('a[href="/products/p-3"]')).toBeTruthy();
  });

  it('spaces the plates with a delay: Safari draws an iterationStart all on the first plate', () => {
    const width = vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(390);
    const options: KeyframeAnimationOptions[] = [];
    const proto = Element.prototype as unknown as { animate?: unknown };
    const original = proto.animate;
    proto.animate = (_: unknown, o: KeyframeAnimationOptions) => {
      options.push(o);
      return { pause: vi.fn(), play: vi.fn(), cancel: vi.fn(), currentTime: 0 };
    };
    draw(<Products summary={{ total: 4, pages: true, items: many(4) }} layout="belt" />);
    proto.animate = original;
    width.mockRestore();
    expect(new Set(options.map((o) => o.delay)).size).toBe(4);
    expect(options.every((o) => !('iterationStart' in o))).toBe(true);
  });

  it('the belt has a button that stops it (moving content must be stoppable)', () => {
    draw(<Products summary={{ total: 6, pages: true, items: many(6) }} layout="belt" />);
    const button = screen.getByLabelText('products.pause');
    fireEvent.click(button);
    expect(screen.getByLabelText('products.play')).toBeTruthy();
  });
});

describe('the site around them', () => {
  it('sends a leads site\'s main button to the products', () => {
    const t = (k: string) => k;
    expect(mainCta({ conversion: 'lead', products: 3 }, t)).toMatchObject({ target: 'products', href: '#products' });
    expect(mainCta({ conversion: 'lead' }, t)).toMatchObject({ target: 'contact' });
  });

  it('keeps a booking site\'s main button on the calendar', () => {
    const t = (k: string) => k;
    expect(mainCta({ conversion: 'book', products: 3, types: [{ name: 'Cut', durationMS: 1800000 }] }, t)).toMatchObject({ target: 'schedule' });
  });

  it('names the products in the menu, by section or by their own page', () => {
    const blocks = [{ type: 'products', id: 'b1' }];
    expect(navLinksFromBlocks(blocks)[0].href).toBe('#products');
    expect(navLinksFromBlocks(blocks, {}, { productsPage: true })[0].href).toBe('/products');
  });

  it('has a page of their own only past what the home page holds', () => {
    expect(productsHavePage({ total: 9, pages: true, items: many(8) })).toBe(true);
    expect(productsHavePage({ total: 8, pages: true, items: many(8) })).toBe(false);
    expect(productsHavePage({ total: 9, pages: false, items: many(8) })).toBe(false);
  });
});

// LT-545 (Erel: design the products' card, their page and a product's page).
describe('the card the owner chose', () => {
  it('draws the plain card where none was chosen, or one that is unknown', () => {
    const { unmount } = render(<WellTiles items={many(4)} pages />);
    expect(screen.getByTestId('products-well').dataset.card).toBe('plain');
    unmount();
    render(<WellTiles items={many(4)} pages card={'shiny' as never} />);
    expect(screen.getByTestId('products-well').dataset.card).toBe('plain');
  });

  it("frames the card in the site's own card look", () => {
    render(<WellTiles items={many(4)} pages card="framed" />);
    const link = screen.getByText('Product 1').closest('a') as HTMLAnchorElement;
    expect(link.className).toContain('card-design');
    expect(link.getAttribute('href')).toBe('/products/p-1');
  });

  it('puts the words on the picture, in one cell so a long name grows the card', () => {
    render(<WellTiles items={[product(0, { name: 'A very long name '.repeat(8) }), ...many(4).slice(1)]} pages card="overlay" />);
    const words = screen.getByText(/A very long name/).parentElement as HTMLElement;
    expect(words.className).toContain('[grid-area:1/1]');
    expect(words.className).toContain('self-end');
    // Positioned like the picture box beside it, or the picture paints over them.
    expect(words.className).toContain('relative');
    expect(words.closest('a')?.className).toContain('grid');
  });

  it("adds a button that opens the product's page at its form", () => {
    const go = vi.fn();
    draw(<WellTiles items={many(4)} pages card="button" cta="I want it" />, vi.fn(), go);
    const buttons = screen.getAllByText('I want it');
    expect(buttons).toHaveLength(4);
    const button = buttons[1].closest('a') as HTMLAnchorElement;
    expect(button.getAttribute('href')).toBe('/products/p-1#inquire');
    fireEvent.click(button);
    expect(go).toHaveBeenCalledWith('/products/p-1#inquire');
    // Not inside the card's own link: one link inside another is no link at all.
    expect(button.parentElement?.closest('a')).toBeNull();
  });

  it('a site without product pages: the button chooses the product for the form here', () => {
    const setInquiry = vi.fn();
    draw(<WellTiles items={many(4)} pages={false} card="button" />, setInquiry);
    fireEvent.click(screen.getAllByText('products.cta')[2].closest('a') as HTMLAnchorElement);
    expect(setInquiry).toHaveBeenCalledWith({ id: 'id2', name: 'Product 2' });
  });

  it('the swap tiles take the card too, their dots on top when the words are on the picture', () => {
    const { unmount } = render(<SwapTiles items={many(4)} pages card="framed" />);
    expect(screen.getByTestId('products-swap').dataset.card).toBe('framed');
    expect(screen.getByText('Product 1').closest('article')?.className).toContain('card-design');
    unmount();
    render(<SwapTiles items={many(4)} pages card="overlay" />);
    expect(screen.getAllByRole('group')[0].className).toContain('top-1');
  });
});

describe('a few tiles (LT-545)', () => {
  it('stand in the middle of their row, and a full catalogue keeps its grid', () => {
    const { unmount } = render(<WellTiles items={many(3)} pages />);
    expect(screen.getByTestId('products-well').className).toContain('justify-center');
    unmount();
    render(<WellTiles items={many(5)} pages />);
    expect(screen.getByTestId('products-well').className).toContain('grid');
    expect(screen.getByTestId('products-well').className).not.toContain('justify-center');
  });
});

describe("a product's page (LT-545)", () => {
  const page = (layout: string | undefined, path = '/products/p-1', contact: React.ReactNode = null) => {
    const script = document.createElement('script');
    script.id = 'lightor-page';
    script.type = 'application/json';
    script.textContent = JSON.stringify({ kind: 'product', data: { product: product(1, { details: ['Silver'], images: [{ url: 'a.webp' }, { url: 'b.webp' }, { url: 'c.webp' }] }), related: [product(2)] } });
    document.body.appendChild(script);
    const setInquiry = vi.fn();
    render(
      <MemoryRouter initialEntries={[path]}>
        <ProductInquiryContext.Provider value={{ inquiry: null, setInquiry }}>
          <ProductPage slug="p-1" businessName="Shop" layout={layout as never} contact={contact} />
        </ProductInquiryContext.Provider>
      </MemoryRouter>
    );
    return { setInquiry };
  };
  afterEach(() => { document.getElementById('lightor-page')?.remove(); });

  it('keeps the pictures beside the words where no layout was chosen', () => {
    page(undefined);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Product 1');
    expect(document.querySelector('.lg\\:grid-cols-2')).not.toBeNull();
    expect(screen.queryByTestId('product-handy')).toBeNull();
  });

  it('hero: one large picture across the page, the words centred under it', () => {
    page('hero');
    expect(document.querySelector('.sm\\:aspect-\\[16\\/9\\]')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).parentElement?.className).toContain('text-center');
  });

  it('gallery: every picture, swiped on a phone, and the button at hand there', () => {
    page('gallery');
    expect(screen.getByRole('group', { name: 'products.pictures' }).querySelectorAll('img')).toHaveLength(3);
    const handy = screen.getByTestId('product-handy');
    // Out of the way until the page's own button scrolls out of view.
    expect(handy.getAttribute('aria-hidden')).toBe('true');
    expect(handy.querySelector('a')?.getAttribute('tabindex')).toBe('-1');
  });

  it('opens at its form with the product chosen when a card sent the visitor (#inquire)', async () => {
    vi.useFakeTimers();
    try {
      const { setInquiry } = page(undefined, '/products/p-1#inquire', <section id="contact"><form /></section>);
      await act(async () => { vi.advanceTimersByTime(100); });
      expect(setInquiry).toHaveBeenLastCalledWith({ id: 'id1', name: 'Product 1' });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("the wizard's sample products in its preview (LT-554)", () => {
  const draft = (i: number, extra: Partial<Product> = {}): Product => product(i, { id: `draft-${i}`, slug: `draft-${i}`, ...extra });
  const drafts = [draft(0), draft(1, { images: [] }), draft(2)];
  afterEach(() => { vi.restoreAllMocks(); });

  it('are the products a preview draws its pages from, and only they', () => {
    expect(draftProducts({ total: 3, pages: true, items: drafts })).toBe(drafts);
    // A saved site's products live at their own addresses, with more than the config carries.
    expect(draftProducts({ total: 2, pages: true, items: [draft(0), product(1)] })).toBeUndefined();
    expect(draftProducts({ total: 0, pages: false, items: [] })).toBeUndefined();
    expect(draftProducts(undefined)).toBeUndefined();
  });

  it("lend the hero their first pictures, in the owner's order", () => {
    expect(productPictures({ total: 3, pages: true, items: drafts })).toEqual(['a0.webp', 'a2.webp']);
    expect(productPictures(undefined)).toEqual([]);
  });

  const at = (slug: string) => {
    const fetch = vi.spyOn(WebConfigService.prototype, 'getProduct');
    render(
      <MemoryRouter initialEntries={[`/products/${slug}`]}>
        <ProductInquiryContext.Provider value={{ inquiry: null, setInquiry: vi.fn() }}>
          <ProductPage slug={slug} businessName="Shop" drafts={drafts} />
        </ProductInquiryContext.Provider>
      </MemoryRouter>
    );
    return fetch;
  };

  it("open a product's page from the preview itself, with the others under it, asking no server", () => {
    const fetch = at('draft-1');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Product 1');
    expect(screen.getByText('Product 0')).toBeTruthy();
    expect(screen.getByText('Product 2')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('a product the preview does not hold is not found, and nothing is fetched', () => {
    const fetch = at('draft-9');
    expect(screen.getByText('not found')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('list every one of them on the products page, asking no server', () => {
    const fetch = vi.spyOn(WebConfigService.prototype, 'getProducts');
    render(
      <MemoryRouter initialEntries={['/products']}>
        <ProductsPage businessName="Shop" drafts={drafts} />
      </MemoryRouter>
    );
    for (const name of ['Product 0', 'Product 1', 'Product 2']) expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    expect(fetch).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Products, { tilesFor } from '../../../components/products/Products';
import { parseProducts, productPrice, productsHavePage, categoriesOf, type Product } from '../../../models/Product';
import { ProductInquiryContext } from '../../../services/productAction';
import { SiteNavContext } from '../../../services/siteNav';
import { mainCta } from '../../../services/siteMode';
import { navLinksFromBlocks } from '../../../services/navLinks';

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), language: 'he' }),
}));

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

  it('leads to the list only past what it holds', () => {
    const { unmount } = render(<Products summary={{ total: 2, pages: true, items: many(2) }} />);
    expect(screen.queryByText(/products\.all/)).toBeNull();
    unmount();
    render(<Products summary={{ total: 24, pages: true, items: many(8) }} />);
    expect(screen.getByText(/products\.all/)).toBeTruthy();
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

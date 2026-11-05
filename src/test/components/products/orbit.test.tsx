import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Products from '../../../components/products/Products';
import { lineSize, orbitArc, orbitTurn, twoLines } from '../../../components/products/motion';
import type { Product } from '../../../models/Product';
import { ProductInquiryContext } from '../../../services/productAction';
import { SiteNavContext } from '../../../services/siteNav';

let language = 'he';
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language }),
}));

const product = (i: number, extra: Partial<Product> = {}): Product => ({
  id: `id${i}`, slug: `p-${i}`, name: `מוצר מספר ${i}`, price: 12000 + i * 100, images: [{ url: `a${i}.webp` }], details: [], ...extra,
});
const many = (n: number) => Array.from({ length: n }, (_, i) => product(i));

/** An observer that sees the section at once, so the orbit turns by itself. */
class SeenObserver {
  constructor(private cb: IntersectionObserverCallback) {}
  observe() { this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

const draw = (n = 5, pages = true) => render(
  <SiteNavContext.Provider value={{ atHome: true, go: vi.fn() }}>
    <ProductInquiryContext.Provider value={{ inquiry: null, setInquiry: vi.fn() }}>
      <Products summary={{ total: n, pages, items: many(n) }} layout="orbit" currency="ILS" />
    </ProductInquiryContext.Provider>
  </SiteNavContext.Provider>
);
const shown = () => screen.getAllByRole('button').filter((b) => b.getAttribute('aria-current') === 'true').map((b) => b.getAttribute('aria-label'));

describe('the orbit (LT-583)', () => {
  beforeEach(() => { language = 'he'; });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('draws every product, each a link, and falls back to calm tiles under three', () => {
    draw(5);
    expect(screen.getByTestId('products-orbit')).toBeTruthy();
    expect(document.querySelectorAll('a[href="/products/p-3"]').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₪120').length).toBeGreaterThan(0);
  });

  it('shows one product at a time to everyone, the rest hidden from screen readers and the keyboard', () => {
    draw(4);
    const heads = screen.getAllByRole('heading', { level: 3, hidden: true });
    expect(heads).toHaveLength(4);
    expect(heads.filter((h) => !h.closest('[aria-hidden="true"]'))).toHaveLength(1);
    const links = Array.from(document.querySelectorAll('[data-testid="products-orbit"] a')) as HTMLAnchorElement[];
    expect(links.filter((a) => a.tabIndex === 0)).toHaveLength(1);
  });

  it('steps with its arrows and its thumbnails, and the right arrow key goes back on a right-to-left page', () => {
    draw(5);
    expect(shown()).toEqual(['מוצר מספר 0']);
    fireEvent.click(screen.getByLabelText('products.next'));
    expect(shown()).toEqual(['מוצר מספר 1']);
    fireEvent.click(screen.getByRole('button', { name: 'מוצר מספר 4' }));
    expect(shown()).toEqual(['מוצר מספר 4']);
    fireEvent.click(screen.getByLabelText('products.next'));
    expect(shown()).toEqual(['מוצר מספר 0']);
    fireEvent.keyDown(screen.getByTestId('products-orbit'), { key: 'ArrowRight' });
    expect(shown()).toEqual(['מוצר מספר 4']);
  });

  it('turns by itself in view until touched, then never again, the news said aloud only after', () => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', SeenObserver);
    draw(5);
    const live = document.querySelector('[data-testid="products-orbit"] [aria-live]') as HTMLElement;
    expect(live.getAttribute('aria-live')).toBe('off');
    act(() => { vi.advanceTimersByTime(5300); });
    expect(shown()).toEqual(['מוצר מספר 1']);
    fireEvent.pointerDown(screen.getByTestId('products-orbit').querySelector('.touch-pan-y') as HTMLElement, { pointerId: 1, clientX: 10, clientY: 10 });
    act(() => { vi.advanceTimersByTime(30000); });
    expect(shown()).toEqual(['מוצר מספר 1']);
    expect(live.getAttribute('aria-live')).toBe('polite');
  });

  it('swings the plates round their pivot with the browser\'s own animations, and only on a change', () => {
    const calls: Keyframe[][] = [];
    const proto = Element.prototype as unknown as { animate?: unknown };
    const original = proto.animate;
    proto.animate = (k: Keyframe[]) => { calls.push(k); return { cancel: vi.fn(), finish: vi.fn() }; };
    try {
      draw(4);
      expect(calls).toHaveLength(0);
      fireEvent.click(screen.getByLabelText('products.next'));
      const swings = calls.filter((k) => String(k[0].transform ?? '').startsWith('rotate('));
      expect(swings).toHaveLength(2);
      // right-to-left: next swings the outgoing plate the mirrored way
      expect(swings[0][2].transform).toBe('rotate(-36deg)');
      expect(swings[1][0].transform).toBe('rotate(36deg)');
      expect(calls.some((k) => 'clipPath' in k[0])).toBe(true);
    } finally {
      proto.animate = original;
    }
  });

  it('never cuts a name: long ones wrap', () => {
    const { container } = render(
      <SiteNavContext.Provider value={{ atHome: true, go: vi.fn() }}>
        <Products summary={{ total: 3, pages: false, items: [product(0, { name: 'סט מברשות איפור מקצועי בעבודת יד מהודרת במיוחד' }), product(1), product(2)] }} layout="orbit" />
      </SiteNavContext.Provider>
    );
    expect(container.innerHTML).not.toMatch(/truncate|line-clamp|text-ellipsis/);
    expect(screen.getAllByText('בעבודת יד מהודרת במיוחד').length).toBeGreaterThan(0);
  });
});

describe('the orbit\'s geometry', () => {
  it('splits a name into a thin line and a heavy one at the word nearest its middle', () => {
    expect(twoLines('Ribeye')).toEqual(['', 'Ribeye']);
    expect(twoLines('Char grill Ribeye')).toEqual(['Char grill', 'Ribeye']);
    expect(twoLines('מלפפונים חמוצים')).toEqual(['מלפפונים', 'חמוצים']);
    expect(twoLines('  ')).toEqual(['', '']);
  });

  it('sizes a line down as it grows, never under its least size', () => {
    expect(lineSize('Ribeye', 3.6, 1.9, 27)).toBe(3.6);
    expect(lineSize('a very long product name indeed', 3.6, 1.9, 27)).toBe(1.9);
  });

  it('draws a closed band, mirrored on a right-to-left page', () => {
    const ltr = orbitArc(false);
    const rtl = orbitArc(true);
    expect(ltr.startsWith('M') && ltr.endsWith('Z')).toBe(true);
    const first = (d: string) => Number(d.slice(1).split(' ')[0]);
    expect(first(rtl)).toBeCloseTo(-first(ltr));
    expect(orbitTurn(0)).toBe(0);
    expect(orbitTurn(5)).toBe(orbitTurn(0));
    expect(orbitTurn(-1)).toBe(orbitTurn(4));
  });
});

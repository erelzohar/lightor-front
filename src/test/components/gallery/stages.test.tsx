import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Portfolio from '../../../components/Portfolio';
import { EditContext } from '../../../services/editMode';
import { PortfolioConfig } from '../../../models/PortfolioConfig';
import { PortfolioItem } from '../../../models/PortfolioItem';
import type { PortfolioLayout } from '../../../models/DesignConfig';

let lang = 'he';
let still = false;
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${Object.values(params).join(' ')}` : key),
    language: lang,
  }),
}));
vi.mock('../../../hooks/useA11yPrefs', () => ({ useStill: () => still }));

const LONG = 'עוגת שכבות חגיגית עם קרם גבינה ופירות יער טריים מהשוק, כל שכבה נאפית בנפרד ומורכבת ביד בבוקר האירוע';
const items = (n: number) => Array.from({ length: n }, (_, i) =>
  new PortfolioItem(`https://example.com/${i + 1}.jpg`, `עבודה ${i + 1}`, i === 0 ? LONG : `תיאור ${i + 1}`, `תמונה ${i + 1}`));
const gallery = (layout: PortfolioLayout, n = 4) => <Portfolio config={new PortfolioConfig(true, 'גלריה', 'העבודות שלנו', items(n))} layout={layout} />;

let intersect: (visible: boolean) => void;
class Observer {
  constructor(private cb: IntersectionObserverCallback) {
    intersect = (visible) => this.cb([{ isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

beforeEach(() => {
  lang = 'he';
  still = false;
  vi.stubGlobal('IntersectionObserver', Observer);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const live = (container: HTMLElement) => container.querySelector('p.sr-only')?.textContent ?? '';

describe.each(['clothesline', 'cascade'] as const)('the %s gallery', (layout) => {
  it('shows every picture with its text alternative, and the whole caption', () => {
    render(gallery(layout));
    for (const n of [1, 2, 3, 4]) expect(screen.getAllByAltText(`תמונה ${n}`, { hidden: true } as never).length).toBe(1);
    expect(screen.getByLabelText('portfolio.slideshow_next')).toBeInTheDocument();
  });

  it('never cuts the caption', () => {
    const { container } = render(gallery(layout, 2));
    fireEvent.keyDown(screen.getByRole('region', { name: 'portfolio.slideshow_label' }), { key: 'ArrowRight' });
    expect(live(container)).toContain(LONG);
    expect(container.innerHTML).not.toMatch(/truncate|line-clamp|text-ellipsis/);
  });

  it('goes the way a right-to-left reader goes with the arrow keys', () => {
    const { container } = render(gallery(layout, 5));
    const region = screen.getByRole('region', { name: 'portfolio.slideshow_label' });
    const before = live(container);
    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(live(container)).toBe(before);
  });

  it('has no controls for a single picture', () => {
    render(gallery(layout, 1));
    expect(screen.queryByLabelText('portfolio.slideshow_next')).toBeNull();
  });
});

describe('the galleries that move on their own', () => {
  const advanced = async (layout: 'clothesline' | 'cascade', ms: number, seen = true) => {
    vi.useFakeTimers();
    const { container } = render(gallery(layout, 4));
    act(() => intersect(seen));
    const before = live(container);
    for (let i = 0; i < 4; i++) await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
    return before !== live(container);
  };

  it.each([['clothesline', 2600], ['cascade', 2600]] as const)('%s turns while it is on screen', async (layout, ms) => {
    expect(await advanced(layout, ms)).toBe(true);
  });

  it.each([['clothesline', 2600], ['cascade', 2600]] as const)('%s waits while it is off-screen', async (layout, ms) => {
    expect(await advanced(layout, ms, false)).toBe(false);
  });

  it.each([['clothesline', 2600], ['cascade', 2600]] as const)('%s holds still for "stop animations"', async (layout, ms) => {
    still = true;
    expect(await advanced(layout, ms)).toBe(false);
  });

  it('stops announcing every turn while it rolls', () => {
    const { container } = render(gallery('cascade', 4));
    expect(container.querySelector('p.sr-only')).toHaveAttribute('aria-live', 'off');
  });
});

describe('the curve', () => {
  it('needs a row to run: under three photos it falls to the grid', () => {
    const { container } = render(gallery('curve', 2));
    expect(container.querySelector('.lt-curve')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('reads as a list for a screen reader, the band hidden from it', () => {
    const { container } = render(gallery('curve', 3));
    expect(container.querySelector('.lt-curve')).not.toBeNull();
    const list = screen.getByRole('list', { name: 'portfolio.grid_label' });
    expect(list.textContent).toContain('תמונה 2');
    expect(list.textContent).toContain(LONG);
  });

  it('holds still in the editor', () => {
    const { container } = render(<EditContext.Provider value={{ editing: true }}>{gallery('curve', 3)}</EditContext.Provider>);
    expect(container.querySelector('.lt-curve')).toHaveAttribute('data-still');
  });
});

describe('in the site editor', () => {
  it.each(['clothesline', 'cascade'] as const)('%s marks every picture, and does not roll', async (layout) => {
    vi.useFakeTimers();
    const { container } = render(<EditContext.Provider value={{ editing: true }}>{gallery(layout, 3)}</EditContext.Provider>);
    act(() => intersect(true));
    for (const i of [0, 1, 2]) expect(container.querySelector(`[data-lt-edit="components.portfolio.items.${i}.url"]`)).not.toBeNull();
    const before = live(container);
    await act(async () => { await vi.advanceTimersByTimeAsync(12000); });
    expect(live(container)).toBe(before);
  });
});

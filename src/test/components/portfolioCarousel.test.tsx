import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ComposedPage from '../../components/blocks/ComposedPage';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { getSiteJitter } from '../../services/seed';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';
import { EditContext } from '../../services/editMode';

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
vi.stubGlobal('IntersectionObserver', NoopObserver);
Element.prototype.scrollIntoView = vi.fn();

vi.mock('@marsidev/react-turnstile', () => ({ Turnstile: (): null => null }));
vi.mock('../../services/AuthService', (): { default: { handshake: unknown } } => ({ default: { handshake: vi.fn().mockResolvedValue(true) } }));
vi.mock('../../services/AppointmentService', () => ({
  default: { getInstance: () => ({ getCalendar: vi.fn().mockResolvedValue({ busy: [], classes: [] }), getAvailability: vi.fn() }) },
}));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

const ITEMS = [
  { url: 'https://picsum.photos/seed/a/800/600', title: 'One', description: 'first' },
  { url: 'https://picsum.photos/seed/b/800/600', title: 'Two', description: 'second' },
  { url: 'https://picsum.photos/seed/c/800/600', title: 'Three', description: 'third' },
];

const renderGallery = (variant: string | undefined, portfolio: Record<string, unknown> = {}) => {
  const raw = RAW_AI_RESPONSE_SHAPE as unknown as { components: { portfolio: Record<string, unknown> } };
  const config = WebsiteConfig.fromJSON({
    ...RAW_AI_RESPONSE_SHAPE,
    components: { ...raw.components, portfolio: { ...raw.components.portfolio, items: ITEMS, ...portfolio } },
    blocks: [{ type: 'gallery', ...(variant ? { variant } : {}) }],
  });
  return render(<ComposedPage config={config} jitter={getSiteJitter('carousel-test')} isPreview={false} />);
};

/**
 * LT-169 — the one-frame slideshow is the 'carousel' layout of the design
 * system. It used to hide behind a per-component `isGrid: false` flag that
 * composed pages forced to true, so nothing the composer or the AI editor
 * chose could ever reach it.
 */
describe('the gallery carousel layout', () => {
  it('renders the slideshow when the gallery block variant is carousel', () => {
    const { container } = renderGallery('carousel');
    const region = container.querySelector('[aria-roledescription="carousel"]');
    expect(region).not.toBeNull();
    expect(container.querySelector('[role="list"]')).toBeNull();
    // One frame at a time: the first item is the live slide, named by its title (LT-582: no description).
    expect(region?.querySelector('[aria-roledescription="slide"]')?.getAttribute('aria-label')).toBe('One');
  });

  it('renders cards, not the slideshow, for every other layout', () => {
    const { container } = renderGallery('grid');
    expect(container.querySelector('[aria-roledescription="carousel"]')).toBeNull();
    // LT-346: a list of pictures (it was a "grid" of cells with no rows).
    expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(3);
    expect([...container.querySelectorAll('[role="listitem"] img')].map((i) => i.getAttribute('alt'))).toEqual(['One', 'Two', 'Three']);
  });

  it('turns on arrow keys only while the slideshow has focus (LT-346: they used to fire while typing in a form)', () => {
    const { container } = renderGallery('carousel');
    const region = container.querySelector('[aria-roledescription="carousel"]') as HTMLElement;
    // The current slide, by its dot (an outgoing slide lingers in jsdom).
    const current = () => [...region.querySelectorAll('[role="tab"]')].findIndex((d) => d.getAttribute('aria-selected') === 'true');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(current()).toBe(0);
    expect(region).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(current()).toBe(1);
    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    expect(current()).toBe(0);
  });

  it('ignores a legacy isGrid flag left in a stored config', () => {
    // Old documents still carry the flag; the layout token alone decides.
    const { container } = renderGallery('carousel', { isGrid: true });
    expect(container.querySelector('[aria-roledescription="carousel"]')).not.toBeNull();
  });

  it('draws nothing rather than crashing on a carousel with no items (an empty gallery is not drawn, LT-320)', () => {
    const { container } = renderGallery('carousel', { items: [] });
    expect(container.querySelector('[aria-roledescription="carousel"]')).toBeNull();
    expect(container.querySelector('#portfolio')).toBeNull();
  });
});

/**
 * LT-582 (Erel 2026-11-05): a gallery picture has a title only. Older sites
 * (and AI builds) still store a description per picture; no layout shows it,
 * says it to screen readers or offers it to edit, since the owner has no field
 * for it any more.
 */
describe('a gallery picture has a title only', () => {
  const LAYOUTS = ['grid', 'masonry', 'filmstrip', 'polaroid', 'flash', 'bento', 'scroller', 'spotlight', 'carousel', 'clothesline', 'curve', 'cascade'];
  const renderEditing = (variant: string) => {
    const raw = RAW_AI_RESPONSE_SHAPE as unknown as { components: { portfolio: Record<string, unknown> } };
    const config = WebsiteConfig.fromJSON({
      ...RAW_AI_RESPONSE_SHAPE,
      components: { ...raw.components, portfolio: { ...raw.components.portfolio, items: ITEMS } },
      blocks: [{ type: 'gallery', variant }],
    });
    return render(
      <EditContext.Provider value={{ editing: true }}>
        <ComposedPage config={config} jitter={getSiteJitter(`titles-${variant}`)} isPreview={false} />
      </EditContext.Provider>
    );
  };

  it.each(LAYOUTS)('the %s layout shows the titles and no description', (variant) => {
    const { container } = renderEditing(variant);
    const gallery = container.querySelector('#portfolio') as HTMLElement;
    expect(gallery).not.toBeNull();
    // The titles show (a stage shows the picture it is on, a grid all of them).
    expect(['One', 'Two', 'Three'].some((title) => gallery.textContent?.includes(title))).toBe(true);
    for (const words of ['first', 'second', 'third']) expect(gallery.textContent).not.toContain(words);
    const paths = [...gallery.querySelectorAll('[data-lt-edit]')].map((el) => el.getAttribute('data-lt-edit') ?? '');
    expect(paths.filter((path) => /items\.\d+\.description/.test(path))).toEqual([]);
    for (const label of [...gallery.querySelectorAll('[aria-label]')].map((el) => el.getAttribute('aria-label') ?? '')) {
      for (const words of ['first', 'second', 'third']) expect(label).not.toContain(words);
    }
  });
});

/** LT-320: emptying the gallery in the editor left nothing to click to add a photo. */
describe('a gallery with no photos', () => {
  const emptyPage = (editing: boolean) => {
    const raw = RAW_AI_RESPONSE_SHAPE as unknown as { components: { portfolio: Record<string, unknown> } };
    const config = WebsiteConfig.fromJSON({
      ...RAW_AI_RESPONSE_SHAPE,
      components: { ...raw.components, portfolio: { ...raw.components.portfolio, items: [] } },
      blocks: [{ type: 'gallery' }],
    });
    return render(
      <EditContext.Provider value={{ editing }}>
        <ComposedPage config={config} jitter={getSiteJitter('empty-gallery')} isPreview={false} />
      </EditContext.Provider>
    );
  };

  it('is not drawn on the live site', () => {
    const { container } = emptyPage(false);
    expect(container.querySelector('#portfolio')).toBeNull();
  });

  it('says so in the editor, inside the gallery section a click selects', () => {
    const { container, getByTestId } = emptyPage(true);
    const note = getByTestId('portfolio-empty');
    expect(note.textContent).toBe('portfolio.empty_edit');
    expect(container.querySelector('#portfolio')?.contains(note)).toBe(true);
    expect(note.closest('[data-lt-edit]')).toBeNull();
  });
});

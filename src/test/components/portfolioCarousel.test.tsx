import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
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
    expect(container.querySelector('[role="grid"]')).toBeNull();
    // One frame at a time: the first item is the live slide.
    expect(region?.querySelector('[aria-roledescription="slide"]')?.getAttribute('aria-label')).toBe('One: first');
  });

  it('renders cards, not the slideshow, for every other layout', () => {
    const { container } = renderGallery('grid');
    expect(container.querySelector('[aria-roledescription="carousel"]')).toBeNull();
    expect(container.querySelectorAll('[role="gridcell"]')).toHaveLength(3);
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

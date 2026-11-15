import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Hero from '../../components/Layout/Hero';
import { HeroConfig } from '../../models/HeroConfig';
import { DesignConfig } from '../../models/DesignConfig';
import { Social } from '../../models/Social';
import { EditContext } from '../../services/editMode';
import { fanPictures, splitHighlight } from '../../components/Layout/heroes/fan';

let still = false;
let language = 'he';
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, o?: { name?: string }) => o?.name ?? k, language }),
}));
vi.mock('../../hooks/useA11yPrefs', () => ({ useStill: () => still }));
vi.mock('../../components/Layout/vantaDeps', () => ({ loadVantaDeps: vi.fn(() => new Promise(() => {})) }));

const config = (over: Partial<HeroConfig> = {}) => ({ ...new HeroConfig(true, 'סטודיו נועה', 'קרמיקה בעבודת יד', 'כלים לבית ולשולחן, בסדנה ברמת גן', 'hero.jpg', 'gradient', 'round', undefined, 'קביעת תור'), ...over }) as HeroConfig;
const services = [{ name: 'סדנת אובניים', durationMS: 3600000, image: 'wheel.jpg' }, { name: 'שיעור פרטי', durationMS: 3600000 }] as never[];

const hero = (props: Partial<React.ComponentProps<typeof Hero>> = {}, design: Record<string, unknown> = {}) => (
  <MemoryRouter>
    <Hero
      config={config()}
      social={Social.fromJSON({ instagram: 'https://instagram.com/noa' })}
      phone="+972501234567"
      isContactVisible
      businessName="נועה"
      appointmentTypes={services}
      design={DesignConfig.fromJSON({ heroLayout: 'fan', sectionWidth: 'wide', ...design })}
      {...props}
    />
  </MemoryRouter>
);

const srcs = (root: HTMLElement) => [...root.querySelectorAll('[data-pictures] img')].map((i) => (i.getAttribute('src') ?? '').split('/').pop());

beforeEach(() => {
  still = false;
  language = 'he';
});

describe("gallery's fan hero (LT-667)", () => {
  it('has the one headline: the title, then the second line ending in the site colour', () => {
    render(hero());
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('סטודיו נועהקרמיקה בעבודת יד');
    const coloured = h1.querySelector('.text-primary-readable');
    expect(coloured?.textContent).toBe('בעבודת יד');
    expect(screen.getByText('כלים לבית ולשולחן, בסדנה ברמת גן')).toBeTruthy();
  });

  it("carries the site's own main button and the contact one", () => {
    const { container } = render(hero());
    const root = screen.getByTestId('hero-fan');
    expect(root.textContent).toContain('קביעת תור');
    expect(container.querySelector('a[href="#contact"]')).not.toBeNull();
  });

  it('its main button is solid even on a site whose buttons are bare words, as in the reference', () => {
    render(hero({}, { buttonStyle: 'ghost' }));
    const main = screen.getByRole('link', { name: 'קביעת תור' });
    expect(main.className).toContain('bg-primary');
  });

  it('fans the hero picture in the middle, the gallery beside it, mirrored on a right-to-left page', () => {
    const { container, unmount } = render(hero({ thumbs: ['a.jpg', 'b.jpg', 'c.jpg'] }));
    expect(container.querySelector('[data-pictures]')?.getAttribute('data-pictures')).toBe('3');
    expect(srcs(container)).toEqual(['b.jpg', 'hero.jpg', 'a.jpg']);
    // The hero picture is the page's largest paint: fetched first, with the business's name.
    const middle = container.querySelectorAll('[data-pictures] img')[1];
    expect(middle.getAttribute('fetchpriority')).toBe('high');
    expect(middle.getAttribute('alt')).toBe('נועה');
    unmount();
    language = 'en';
    const ltr = render(hero({ thumbs: ['a.jpg', 'b.jpg', 'c.jpg'] }));
    expect(srcs(ltr.container)).toEqual(['a.jpg', 'hero.jpg', 'b.jpg']);
  });

  it('of two pictures, the hero\'s is the card in front and first in reading order, in both directions', () => {
    const front = (root: HTMLElement) => root.querySelector('[data-front] img')?.getAttribute('src')?.split('/').pop();
    const he = render(hero({ thumbs: ['a.jpg'], appointmentTypes: [] }));
    expect(srcs(he.container)).toEqual(['a.jpg', 'hero.jpg']);
    expect(front(he.container)).toBe('hero.jpg');
    he.unmount();
    language = 'en';
    const en = render(hero({ thumbs: ['a.jpg'], appointmentTypes: [] }));
    expect(srcs(en.container)).toEqual(['hero.jpg', 'a.jpg']);
    expect(front(en.container)).toBe('hero.jpg');
    expect(en.container.querySelectorAll('[data-front]')).toHaveLength(1);
  });

  it("takes a service's picture when the gallery has too few, and stands two or one when the site has no more", () => {
    const two = render(hero({ thumbs: ['a.jpg'] }));
    expect(srcs(two.container).sort()).toEqual(['a.jpg', 'hero.jpg', 'wheel.jpg']);
    two.unmount();
    const fewer = render(hero({ thumbs: [], appointmentTypes: [] }));
    expect(fewer.container.querySelector('[data-pictures]')?.getAttribute('data-pictures')).toBe('1');
    fewer.unmount();
    const pair = render(hero({ thumbs: ['hero.jpg', 'a.jpg'], appointmentTypes: [] }));
    expect(pair.container.querySelector('[data-pictures]')?.getAttribute('data-pictures')).toBe('2');
    pair.unmount();
    const none = render(hero({ config: config({ heroImageSrc: '' }), thumbs: [], appointmentTypes: [] }));
    expect(none.container.querySelector('[data-pictures]')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });

  it("the owner's figures are its line of proof; with none, the social links", () => {
    const withStats = render(hero({ stats: [{ value: '12', label: 'שנות ניסיון' }, { value: '500', label: 'לקוחות' }] }));
    expect(screen.getByTestId('fan-proof').textContent).toContain('12שנות ניסיון');
    expect(withStats.container.querySelector('button[aria-label="footer.social.follow.instagram"]')).toBeNull();
    withStats.unmount();
    const without = render(hero());
    expect(screen.queryByTestId('fan-proof')).toBeNull();
    expect(without.container.querySelector('button[aria-label="footer.social.follow.instagram"]')).not.toBeNull();
  });

  it("the stamp decor's line is a pill above the title, never the round seal in the corner over a centred title", () => {
    const { container } = render(hero({ config: config({ stamp: 'אפייה טרייה מדי בוקר' }) }, { decor: 'stamp' }));
    expect(screen.getByTestId('fan-stamp').textContent).toBe('אפייה טרייה מדי בוקר');
    expect(container.querySelector('.-rotate-12')).toBeNull();
    // Another hero keeps its seal.
    const other = render(hero({ config: config({ stamp: 'אפייה טרייה מדי בוקר' }) }, { decor: 'stamp', heroLayout: 'centered' }));
    expect(other.container.querySelector('.-rotate-12')).not.toBeNull();
  });

  it('is compact on a site whose sections sit in a narrower column', () => {
    const wide = render(hero());
    expect(screen.getByTestId('hero-fan').hasAttribute('data-compact')).toBe(false);
    wide.unmount();
    render(hero({}, { sectionWidth: 'contained' }));
    expect(screen.getByTestId('hero-fan').getAttribute('data-compact')).toBe('true');
  });

  it('stands still, the cards already fanned, for "stop animations"', () => {
    still = true;
    const { container } = render(hero({ thumbs: ['a.jpg', 'b.jpg'] }));
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.style.opacity).not.toBe('0');
    expect(h1.style.filter ?? '').not.toContain('blur');
    const cards = [...container.querySelectorAll<HTMLElement>('[data-pictures] .aspect-\\[4\\/5\\]')];
    expect(cards).toHaveLength(3);
    expect(cards[0].style.transform).toContain('rotate(-6deg)');
    expect(cards[1].style.transform ?? '').not.toContain('rotate(-');
    expect(cards[2].style.transform).toContain('rotate(6deg)');
    for (const c of cards) expect(c.style.opacity).not.toBe('0');
  });

  it('starts from hidden when it moves', () => {
    const { container } = render(hero({ thumbs: ['a.jpg', 'b.jpg'] }));
    expect(screen.getByRole('heading', { level: 1 }).style.opacity).toBe('0');
    expect(container.querySelector<HTMLElement>('[data-pictures] .aspect-\\[4\\/5\\]')?.style.opacity).toBe('0');
  });

  it('in the editor: nothing moves, the whole second line is one text, each picture names its field', () => {
    const { container } = render(<EditContext.Provider value={{ editing: true }}>{hero({ thumbs: ['a.jpg', 'b.jpg'] })}</EditContext.Provider>);
    expect(screen.getByRole('heading', { level: 1 }).style.opacity).not.toBe('0');
    expect(container.querySelector('[data-lt-edit="components.hero.subtitle"]')?.textContent).toBe('קרמיקה בעבודת יד');
    const paths = [...container.querySelectorAll('[data-pictures] img')].map((i) => i.getAttribute('data-lt-edit'));
    expect(paths.sort()).toEqual(['components.hero.heroImageSrc', 'components.portfolio.items.0.url', 'components.portfolio.items.1.url']);
  });

  it("no Vanta under it: the page's own colour is its backdrop", async () => {
    const { loadVantaDeps } = await import('../../components/Layout/vantaDeps');
    vi.mocked(loadVantaDeps).mockClear();
    render(hero());
    expect(loadVantaDeps).not.toHaveBeenCalled();
  });
});

describe('the fan helpers (LT-667)', () => {
  it('colours the last half of the words, all of one word', () => {
    expect(splitHighlight('Handmade ceramics')).toEqual(['Handmade', 'ceramics']);
    expect(splitHighlight('קרמיקה בעבודת יד')).toEqual(['קרמיקה', 'בעבודת יד']);
    expect(splitHighlight('Ceramics')).toEqual(['', 'Ceramics']);
    expect(splitHighlight('  ')).toEqual(['', '']);
  });

  it('takes each picture once, never a video, three at most', () => {
    expect(fanPictures('h.jpg', ['h.jpg', 'a.mp4', 'b.jpg'], 'components.portfolio.items', ['b.jpg', 'c.jpg', 'd.jpg']))
      .toEqual([
        { src: 'h.jpg', path: 'components.hero.heroImageSrc', hero: true },
        { src: 'b.jpg', path: 'components.portfolio.items.2.url' },
        { src: 'c.jpg' },
      ]);
    expect(fanPictures(undefined, [], undefined, [])).toEqual([]);
  });
});

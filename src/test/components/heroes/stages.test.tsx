import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Hero from '../../../components/Layout/Hero';
import Navbar from '../../../components/Layout/Navbar';
import { HeroConfig } from '../../../models/HeroConfig';
import { DesignConfig, type HeroLayout } from '../../../models/DesignConfig';
import { Social } from '../../../models/Social';
import { EditContext } from '../../../services/editMode';
import { metalTint } from '../../../components/Layout/heroes/MetalRibbons';
import { clamp } from '../../../components/Layout/heroes/common';

let still = false;
let cutout = false;
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, o?: { name?: string }) => o?.name ?? k, language: 'he' }),
}));
vi.mock('../../../hooks/useA11yPrefs', () => ({ useStill: () => still }));
vi.mock('../../../utils/cutout', async (orig) => ({ ...(await orig<typeof import('../../../utils/cutout')>()), useCutout: () => cutout }));
vi.mock('../../../components/Layout/vantaDeps', () => ({ loadVantaDeps: vi.fn(() => new Promise(() => {})) }));

class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

const config = (over: Partial<HeroConfig> = {}) => ({ ...new HeroConfig(true, 'סטודיו נועה', 'טיפוח מדויק', 'סטודיו ביתי ברמת גן', 'hero.jpg', 'gradient', 'round', 'אפייה טרייה מדי בוקר', 'קביעת תור'), ...over });
const services = [{ name: 'מניקור', durationMS: 3600000 }, { name: 'פדיקור', durationMS: 3600000 }] as never[];

const hero = (heroLayout: HeroLayout, props: Partial<React.ComponentProps<typeof Hero>> = {}) => (
  <MemoryRouter>
    <Hero
      config={config() as HeroConfig}
      social={Social.fromJSON({})}
      phone={null}
      isContactVisible
      businessName="נועה"
      appointmentTypes={services}
      design={DesignConfig.fromJSON({ heroLayout })}
      {...props}
    />
  </MemoryRouter>
);

const STATS = [{ value: '12', label: 'שנות ניסיון' }, { value: '500', label: 'לקוחות' }];

beforeEach(() => {
  still = false;
  cutout = false;
  vi.stubGlobal('IntersectionObserver', Observer);
  vi.stubGlobal('ResizeObserver', Observer);
});

describe.each(['parallax', 'expand', 'aero', 'collage'] as const)('the %s hero', (layout) => {
  it('has the one headline of the page, the description and the main button', () => {
    render(hero(layout));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('סטודיו נועה');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('טיפוח מדויק');
    expect(screen.getByText('סטודיו ביתי ברמת גן')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'קביעת תור' })).toHaveAttribute('href', '#schedule');
  });

  it('never cuts its text', () => {
    const { container } = render(hero(layout));
    expect(container.innerHTML).not.toMatch(/truncate|line-clamp|text-ellipsis/);
  });

  it('draws its own backdrop, so no heavy effect is fetched for it', async () => {
    const { loadVantaDeps } = await import('../../../components/Layout/vantaDeps');
    vi.mocked(loadVantaDeps).mockClear();
    render(hero(layout));
    expect(loadVantaDeps).not.toHaveBeenCalled();
  });
});

describe('a hero that is one big photo', () => {
  it.each(['parallax', 'expand', 'aero'] as const)('%s falls to the split for a round logo', (layout) => {
    cutout = true;
    const { container } = render(hero(layout));
    expect(container.querySelector('img.object-contain, img[data-cutout]')).not.toBeNull();
  });

  it.each(['parallax', 'expand', 'aero'] as const)('%s stands on its words with no picture', (layout) => {
    const { container } = render(hero(layout, { config: config({ heroImageSrc: '' }) as HeroConfig }));
    expect(screen.getAllByRole('heading', { level: 1 })[0].textContent).toContain('סטודיו נועה');
    expect(container.querySelector('img')).toBeNull();
  });

  it('turns an outline button solid on the photo', () => {
    render(hero('parallax', { design: DesignConfig.fromJSON({ heroLayout: 'parallax', buttonStyle: 'outline' }) }));
    expect(screen.getByRole('link', { name: 'קביעת תור' }).className).toContain('bg-primary');
  });
});

describe('the scroll heroes', () => {
  it('do not listen to the scroll when held still', () => {
    still = true;
    const add = vi.spyOn(window, 'addEventListener');
    render(hero('parallax'));
    render(hero('expand'));
    expect(add.mock.calls.filter(([type]) => type === 'scroll')).toEqual([]);
    add.mockRestore();
  });

  it('take no wheel or touch from the visitor: the page scrolls as it always does', () => {
    const add = vi.spyOn(window, 'addEventListener');
    render(hero('expand'));
    const types = add.mock.calls.map(([type]) => type);
    expect(types).toContain('scroll');
    expect(types).not.toContain('wheel');
    expect(types).not.toContain('touchmove');
    add.mockRestore();
  });

  it('expand stands opened in the editor and when held still, with no tall box', () => {
    const { container } = render(<EditContext.Provider value={{ editing: true }}>{hero('expand')}</EditContext.Provider>);
    expect(container.querySelector('[style*="200vh"]')).toBeNull();
    still = true;
    const held = render(hero('expand'));
    expect(held.container.querySelector('[style*="200vh"]')).toBeNull();
  });

  it('expand is sticky in a box that does not clip it', () => {
    const { container } = render(hero('expand'));
    expect(container.querySelector('[style*="200vh"]')).not.toBeNull();
    expect(container.querySelector('.sticky')).not.toBeNull();
    expect(container.querySelector('section')?.className).not.toContain('overflow-hidden');
  });
});

describe('the aero hero', () => {
  it("shows the owner's figure, never one of its own", () => {
    render(hero('aero', { stats: STATS, thumbs: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg'] }));
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('שנות ניסיון')).toBeInTheDocument();
  });

  it('lets the owner edit the figure, in the field the editor already knows', () => {
    const { container } = render(<EditContext.Provider value={{ editing: true }}>{hero('aero', { stats: STATS, statsPath: 'blocks.h.props.items' })}</EditContext.Provider>);
    expect(container.querySelector('[data-lt-edit="blocks.h.props.items.0.value"]')?.textContent).toBe('12');
    expect(container.querySelector('[data-lt-edit="blocks.h.props.items.0.label"]')?.textContent).toBe('שנות ניסיון');
  });

  it('falls to the stamp line with no figures', () => {
    render(hero('aero', { thumbs: ['a.jpg', 'b.jpg'] }));
    expect(screen.getByText('אפייה טרייה מדי בוקר')).toBeInTheDocument();
    expect(screen.queryByText(/\d/)).toBeNull();
  });

  it('shows four small circles at most', () => {
    const { container } = render(hero('aero', { thumbs: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg'] }));
    expect(container.querySelectorAll('img.rounded-full')).toHaveLength(4);
  });

  it("rolls the business's services along the foot", () => {
    const { container } = render(hero('aero'));
    expect(container.textContent).toContain('מניקור');
  });
});

describe('the collage hero', () => {
  it('frames the hero picture and the first two of the gallery', () => {
    const { container } = render(hero('collage', { thumbs: ['a.jpg', 'b.jpg', 'c.jpg'] }));
    const srcs = [...container.querySelectorAll('img')].map((i) => i.getAttribute('src') ?? '');
    expect(srcs).toHaveLength(3);
    expect(srcs[0]).toContain('hero.jpg');
    expect(srcs[1]).toContain('a.jpg');
    expect(srcs[2]).toContain('b.jpg');
  });

  it('stands on the hero picture alone when there is no gallery, in a box only as tall as it (LT-554)', () => {
    const { container } = render(hero('collage'));
    expect(container.querySelectorAll('img')).toHaveLength(1);
    const box = container.querySelector('[data-pictures]');
    expect(box?.getAttribute('data-pictures')).toBe('1');
    // Erel's build: one picture atop a box kept for three, the title far below it.
    expect(box?.className).not.toContain('h-[31rem]');
    expect(box?.className).toContain('sm:h-80');
  });

  it('stands two pictures across in a box for two (LT-554)', () => {
    const { container } = render(hero('collage', { thumbs: ['a.jpg'] }));
    expect(container.querySelectorAll('img')).toHaveLength(2);
    const box = container.querySelector('[data-pictures]');
    expect(box?.getAttribute('data-pictures')).toBe('2');
    expect(box?.className).toContain('sm:h-[25rem]');
  });

  it("the products' pictures are no gallery's in the editor (LT-554)", () => {
    const edited = (props: Partial<React.ComponentProps<typeof Hero>>) => {
      const { container, unmount } = render(<EditContext.Provider value={{ editing: true }}>{hero('collage', { thumbs: ['a.jpg', 'b.jpg'], ...props })}</EditContext.Provider>);
      const paths = [...container.querySelectorAll('img')].map((i) => i.getAttribute('data-lt-edit'));
      unmount();
      return paths;
    };
    expect(edited({})).toEqual(['components.hero.heroImageSrc', 'components.portfolio.items.0.url', 'components.portfolio.items.1.url']);
    expect(edited({ thumbsOfProducts: true })).toEqual(['components.hero.heroImageSrc', null, null]);
  });

  it('holds its shapes still for "stop animations"', () => {
    still = true;
    const { container } = render(hero('collage'));
    expect(container.querySelector('.lt-float')).toBeNull();
  });
});

describe('the backdrops', () => {
  const backdrop = (decor: 'sonar' | 'metal', variant: HeroLayout = 'poster-statement') =>
    hero(variant, { design: DesignConfig.fromJSON({ heroLayout: variant, decor }), jitter: { posterAlt: true, flipPosterSplit: false, decorStart: false } });

  it('sonar draws its field and fetches no heavy effect', async () => {
    const { loadVantaDeps } = await import('../../../components/Layout/vantaDeps');
    vi.mocked(loadVantaDeps).mockClear();
    const { container } = render(backdrop('sonar'));
    expect(container.querySelector('canvas')).not.toBeNull();
    expect(loadVantaDeps).not.toHaveBeenCalled();
  });

  it('keeps the fold to itself: the poster pair does not swap it for the split', () => {
    const { container } = render(backdrop('sonar'));
    expect(container.querySelector('.text-echo')).not.toBeNull();
  });

  it('a site without one keeps the swap', () => {
    const { container } = render(hero('poster-statement', { jitter: { posterAlt: true, flipPosterSplit: false, decorStart: false } }));
    expect(container.querySelector('.text-echo')).toBeNull();
  });

  it('metal lifts a dark colour toward chrome, so it still shines', () => {
    const [r, g, b] = metalTint('#8a2b2b');
    expect(r).toBeGreaterThan(g);
    expect(Math.min(r, g, b)).toBeGreaterThan(0.3);
    expect(metalTint('not a colour').every((c) => c > 0.3)).toBe(true);
  });
});

describe('the bar over a parallax hero', () => {
  const site = (variant: string) => ({
    businessName: 'נועה', logoImageName: 'l.png', appointmentTypes: [], contact: {}, social: {},
    components: { navbar: { visible: true }, portfolio: { visible: false }, about: { visible: false }, testimonials: { visible: false }, contact: { visible: false } },
    design: { navbarStyle: 'floating' }, blocks: [{ id: 'h', type: 'hero', variant }],
  }) as never;

  it('is painted from the top of the page, on the photo', () => {
    const { container } = render(<MemoryRouter><Navbar websiteConfig={site('parallax')} /></MemoryRouter>);
    expect(container.querySelector('nav')?.className).toContain('backdrop-blur');
  });

  it('stays clear on any other hero', () => {
    const { container } = render(<MemoryRouter><Navbar websiteConfig={site('centered')} /></MemoryRouter>);
    expect(container.querySelector('nav')?.className).not.toContain('backdrop-blur');
  });
});

describe('the arithmetic', () => {
  it('clamps', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
  });
});

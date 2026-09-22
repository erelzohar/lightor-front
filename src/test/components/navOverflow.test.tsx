import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import Navbar from '../../components/Layout/Navbar';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key, language: 'en' }),
}));

class NoopObserver { observe() {} unobserve() {} disconnect() {} }

const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
const originalClient = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
/** The measured row is the one carrying overflow-hidden; jsdom has no layout, so widths are stubbed. */
let rowContent = 0;
let rowRoom = 0;

const config = (navbarStyle: 'floating' | 'pill' | 'split' | 'centered') => ({
  logoImageName: 'logo.png',
  businessName: 'Pro NBA Kits',
  components: {
    navbar: { visible: true, darkMode: true, languageSwitcher: false },
    about: { visible: true, title: 'About' },
    portfolio: { visible: true, title: 'Work' },
    contact: { visible: true, title: 'Contact' },
  },
  design: { navbarStyle },
  blocks: ['hero', 'intro', 'gallery', 'faq', 'contact'].map((type, i) => ({ id: `b${i}`, type })),
});

const burgerOf = (c: HTMLElement) => c.querySelector<HTMLElement>('button[aria-label="nav.open_menu"]')!;
const rowOf = (c: HTMLElement) => c.querySelector<HTMLElement>('div.overflow-hidden.whitespace-nowrap')!;

/** LT-173 — a links row that does not fit collapses into the burger; nothing wraps or overlaps. */
describe('navbar overflow', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', NoopObserver);
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get() { return this.classList.contains('overflow-hidden') ? rowContent : 0; } });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return this.classList.contains('overflow-hidden') ? rowRoom : 0; } });
  });
  afterEach(() => {
    if (originalScroll) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', originalScroll);
    if (originalClient) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClient);
    vi.unstubAllGlobals();
  });

  it.each(['floating', 'pill', 'split', 'centered'] as const)('%s: links fit → row visible, burger only on phones', (style) => {
    rowContent = 480; rowRoom = 600;
    const { container } = render(<Navbar websiteConfig={config(style)} />);
    expect(rowOf(container).className).not.toContain('invisible');
    expect(burgerOf(container).className).toContain('md:hidden');
  });

  it.each(['floating', 'pill', 'split', 'centered'] as const)('%s: links wider than their room → row hidden, burger at every width', (style) => {
    rowContent = 900; rowRoom = 500;
    const { container } = render(<Navbar websiteConfig={config(style)} />);
    expect(rowOf(container).className).toContain('invisible');
    expect(rowOf(container).getAttribute('aria-hidden')).toBe('true');
    expect(burgerOf(container).className).not.toContain('md:hidden');
  });

  it('labels never wrap and the brand block keeps its width from md up', () => {
    rowContent = 0; rowRoom = 0;
    const { container } = render(<Navbar websiteConfig={config('pill')} />);
    for (const a of rowOf(container).querySelectorAll('a')) expect(a.className).toContain('whitespace-nowrap');
    expect(container.querySelector('button[aria-label="nav.home"]')?.className).toContain('md:shrink-0');
  });

  it.each(['floating', 'minimal', 'pill', 'split', 'centered'] as const)('%s: the business name wraps, never truncates (LT-190)', (style) => {
    rowContent = 0; rowRoom = 0;
    const { container } = render(<Navbar websiteConfig={config(style)} />);
    const name = container.querySelector('.business-name')!;
    expect(name.className).not.toContain('truncate');
    expect(name.className).toContain('break-words');
    expect(container.querySelector('button[aria-label="nav.home"]')?.className).toContain('min-w-0');
  });
});

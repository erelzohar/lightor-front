import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import Navbar from '../../components/Layout/Navbar';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key, language: 'en' }),
}));

let onResize: (() => void) | null = null;
// Every observer the bar creates gets the resize (LT-173 added a second one,
// for the links row); keeping only the last callback starved the first.
const callbacks: (() => void)[] = [];
class FakeResizeObserver {
  constructor(callback: () => void) { callbacks.push(callback); onResize = () => callbacks.forEach((cb) => cb()); }
  observe() {}
  unobserve() {}
  disconnect() {}
}

const originalTop = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop');
const originalHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
let barHeight = 56;

const config = (visible = true) => ({
  logoImageName: 'logo.png',
  businessName: 'Zohar Sweets',
  components: {
    navbar: { visible, darkMode: false, languageSwitcher: false },
    about: { visible: true },
    portfolio: { visible: true },
    contact: { visible: true },
  },
  design: { navbarStyle: 'pill' as const },
});

const published = () => document.documentElement.style.getPropertyValue('--nav-offset');

/**
 * LT-163 — the hero pads from the navbar's real bottom edge. jsdom has no
 * layout, so the bar's geometry is stubbed: a pill floats 16px down.
 */
describe('navbar offset', () => {
  beforeEach(() => {
    onResize = null;
    callbacks.length = 0;
    barHeight = 56;
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
      configurable: true,
      get() { return this.tagName === 'NAV' ? 16 : 0; },
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() { return this.tagName === 'NAV' ? barHeight : 0; },
    });
    document.documentElement.style.removeProperty('--nav-offset');
  });

  afterEach(() => {
    if (originalTop) Object.defineProperty(HTMLElement.prototype, 'offsetTop', originalTop);
    if (originalHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalHeight);
    vi.unstubAllGlobals();
  });

  it("publishes where the bar ends, counting a floating bar's gap from the top", () => {
    render(<Navbar websiteConfig={config()} />);
    expect(published()).toBe('72px');
  });

  it('follows the bar when it grows, as when a long name wraps', () => {
    render(<Navbar websiteConfig={config()} />);
    barHeight = 93;
    onResize?.();
    expect(published()).toBe('109px');
  });

  it('publishes nothing to clear when the navbar is hidden', () => {
    render(<Navbar websiteConfig={config(false)} />);
    expect(published()).toBe('0px');
  });
});

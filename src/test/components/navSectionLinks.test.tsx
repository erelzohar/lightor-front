import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import Navbar from '../../components/Layout/Navbar';
import { AppointmentType } from '../../models/AppointmentType';

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key, language: 'he' }),
}));

const HAIRCUT = AppointmentType.fromJSON({ _id: 's1', name: 'Haircut', price: '80', durationMS: 1800000 });
const CONFIG = {
  logoImageName: 'l.png',
  businessName: 'Z',
  components: {
    navbar: { visible: true, darkMode: false, languageSwitcher: false },
    about: { visible: true, title: 'עלינו' },
    schedule: { title: 'קביעת תור' },
    contact: { visible: true, title: 'צור קשר' },
  },
  blocks: ['hero', 'intro', 'schedule', 'contact'].map((type, i) => ({ id: `b${i}`, type })),
  appointmentTypes: [HAIRCUT],
};

let scrollTo: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', NoopObserver);
  vi.stubGlobal('IntersectionObserver', NoopObserver);
  scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  scrollTo.mockRestore();
  window.history.replaceState(null, '', '/');
  document.getElementById('schedule')?.remove();
});

/** LT-222 — a menu link scrolls to its section and leaves the section's address in the bar. */
describe('navbar section links', () => {
  it('scrolls under the bar and names the section in the address', () => {
    const target = document.createElement('section');
    target.id = 'schedule';
    target.getBoundingClientRect = () => ({ top: 1200, bottom: 1600, left: 0, right: 0, width: 0, height: 400, x: 0, y: 1200, toJSON: () => ({}) });
    document.body.appendChild(target);

    const { container } = render(<Navbar websiteConfig={CONFIG as never} />);
    // What the bar publishes as its bottom edge in a real layout (jsdom measures 0).
    document.documentElement.style.setProperty('--nav-offset', '72px');
    const link = container.querySelector<HTMLAnchorElement>('a[href="#schedule"]')!;
    expect(link).toBeTruthy();
    fireEvent.click(link);

    expect(scrollTo).toHaveBeenCalledWith({ top: 1200 - 72, behavior: 'smooth' });
    expect(window.location.hash).toBe('#schedule');
    document.documentElement.style.removeProperty('--nav-offset');
  });

  it('leaves the address alone when the section is not on the page', () => {
    const { container } = render(<Navbar websiteConfig={CONFIG as never} />);
    fireEvent.click(container.querySelector<HTMLAnchorElement>('a[href="#schedule"]')!);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('');
  });
});

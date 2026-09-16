import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import Navbar from '../../components/Layout/Navbar';
import Footer from '../../components/Layout/Footer';
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
const components = (titles: Partial<Record<'about' | 'portfolio' | 'schedule' | 'faq' | 'contact', string>>) => ({
  navbar: { visible: true, darkMode: false, languageSwitcher: false },
  about: { visible: true, title: titles.about },
  portfolio: { visible: true, title: titles.portfolio },
  schedule: { title: titles.schedule },
  faq: { title: titles.faq },
  contact: { visible: true, title: titles.contact },
});
const BLOCKS = ['hero', 'intro', 'gallery', 'schedule', 'faq', 'contact'].map((type, i) => ({ id: `b${i}`, type }));
const TITLES = { about: 'קצת עלינו', portfolio: 'היצירות שלנו', schedule: 'הזמנת מארזים', faq: 'שאלות נפוצות', contact: 'דברו איתנו' };

/** Text of the first anchor per href, whichever navbar layout rendered it. */
const labelsByHref = (container: HTMLElement): Record<string, string> => {
  const out: Record<string, string> = {};
  container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => { if (!(a.getAttribute('href')! in out)) out[a.getAttribute('href')!] = a.textContent?.trim() ?? ''; });
  return out;
};

/** LT-168 — menu labels are the headings they scroll to. */
describe('nav labels follow the section titles', () => {
  beforeEach(() => { vi.stubGlobal('ResizeObserver', NoopObserver); vi.stubGlobal('IntersectionObserver', NoopObserver); });
  afterEach(() => vi.unstubAllGlobals());

  it('composed menu: each link reads as its section title', () => {
    const { container } = render(<Navbar websiteConfig={{ logoImageName: 'l.png', businessName: 'Z', components: components(TITLES), blocks: BLOCKS, appointmentTypes: [HAIRCUT] }} />);
    const labels = labelsByHref(container);
    expect(labels['#about']).toBe(TITLES.about);
    expect(labels['#portfolio']).toBe(TITLES.portfolio);
    expect(labels['#faq']).toBe(TITLES.faq);
    expect(labels['#contact']).toBe(TITLES.contact);
  });

  it('composed menu: a section without a title keeps the generic label', () => {
    const { container } = render(<Navbar websiteConfig={{ logoImageName: 'l.png', businessName: 'Z', components: components({ ...TITLES, faq: '  ' }), blocks: BLOCKS, appointmentTypes: [HAIRCUT] }} />);
    expect(labelsByHref(container)['#faq']).toBe('שאלות');
  });

  it('a heading too long for the bar keeps the generic label (LT-173)', () => {
    const { container } = render(<Navbar websiteConfig={{ logoImageName: 'l.png', businessName: 'Z', components: components({ ...TITLES, contact: 'צרו קשר להזמנות מיוחדות', about: 'Dedicated to Basketball Culture' }), blocks: BLOCKS, appointmentTypes: [HAIRCUT] }} />);
    const labels = labelsByHref(container);
    expect(labels['#contact']).toBe('צור קשר');
    expect(labels['#about']).toBe('אודות');
  });

  it('legacy menu: same rule', () => {
    const { container } = render(<Navbar websiteConfig={{ logoImageName: 'l.png', businessName: 'Z', components: components({ about: 'עלינו' }), appointmentTypes: [HAIRCUT] }} />);
    const labels = labelsByHref(container);
    expect(labels['#about']).toBe('עלינו');
    expect(labels['#portfolio']).toBe('nav.portfolio');
    expect(labels['#contact']).toBe('nav.contact');
  });

  it('footer quick links: same rule', () => {
    const { container } = render(
      <Footer
        config={{ description: 'd' }}
        social={{ instagram: '', facebook: '', tiktok: '' } as never}
        businessName="Z"
        logoImageName="l.png"
        appointmentsType={[HAIRCUT]}
        websiteConfig={components({ about: 'עלינו', schedule: 'הזמנת מארזים' })}
        layout="columns"
      />
    );
    const labels = labelsByHref(container);
    expect(labels['#about']).toBe('עלינו');
    expect(labels['#schedule']).toBe('הזמנת מארזים');
    expect(labels['#contact']).toBe('nav.contact');
  });
});

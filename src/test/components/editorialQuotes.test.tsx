import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Testimonials from '../../components/Layout/Testimonials';
import { EditContext } from '../../services/editMode';
import { TestimonialsConfig, TestimonialItem } from '../../models/TestimonialsConfig';

let lang = 'he';
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, o?: { index?: number }) => (o?.index ? `${k} ${o.index}` : k), language: lang }),
}));
vi.mock('../../hooks/useA11yPrefs', () => ({ useStill: () => true }));

const LONG = 'הגעתי בלי לדעת מה אני רוצה ויצאתי עם בדיוק מה שחיפשתי, השירות היה סבלני ומדויק מההתחלה ועד הסוף, וכל פרט קטן קיבל תשומת לב שלא ראיתי בשום מקום אחר';
const quotes = (n: number) => new TestimonialsConfig(true, 'המלצות', Array.from({ length: n }, (_, i) => new TestimonialItem(`נועה ${i + 1}`, i === 0 ? LONG : `המלצה ${i + 1}`)));

beforeEach(() => { lang = 'he'; });

/** LT-535 — Erel's editorial testimonials, as heritage's own. */
describe('the editorial testimonials', () => {
  it('shows one voice whole, with its number', () => {
    const { container } = render(<Testimonials config={quotes(3)} tone="bg" layout="editorial" />);
    expect(screen.getByText(LONG)).toBeInTheDocument();
    expect(screen.queryByText('המלצה 2')).toBeNull();
    expect(container.textContent).toContain('01 / 03');
    expect(container.innerHTML).not.toMatch(/truncate|line-clamp|text-ellipsis/);
  });

  it('stands the first letter of the name where the reference had a portrait', () => {
    const { container } = render(<Testimonials config={quotes(1)} tone="bg" layout="editorial" />);
    expect(container.querySelector('figcaption [aria-hidden]')?.textContent).toBe('נ');
    expect(container.querySelector('img')).toBeNull();
  });

  it('turns with the arrows, round the ends, and with the lines', async () => {
    render(<Testimonials config={quotes(3)} tone="bg" layout="editorial" />);
    fireEvent.click(screen.getByRole('button', { name: 'portfolio.slideshow_prev' }));
    await waitFor(() => expect(screen.getByText('המלצה 3')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'portfolio.slideshow_dot 2' }));
    await waitFor(() => expect(screen.getByText('המלצה 2')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'portfolio.slideshow_dot 2' })).toHaveAttribute('aria-current', 'true');
  });

  it('has nothing to turn with a single voice', () => {
    render(<Testimonials config={quotes(1)} tone="bg" layout="editorial" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('marks the voice for the site editor', () => {
    const { container } = render(<EditContext.Provider value={{ editing: true }}><Testimonials config={quotes(2)} tone="bg" layout="editorial" /></EditContext.Provider>);
    expect(container.querySelector('[data-lt-edit="components.testimonials.items.0.text"]')).not.toBeNull();
    expect(container.querySelector('[data-lt-edit="components.testimonials.items.0.name"]')).not.toBeNull();
  });
});

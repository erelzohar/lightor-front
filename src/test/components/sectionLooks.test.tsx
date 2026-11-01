import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ServicesLedger from '../../components/Layout/ServicesLedger';
import BookingBand from '../../components/Layout/BookingBand';
import Manifesto from '../../components/blocks/Manifesto';
import { EditContext } from '../../services/editMode';
import type { AppointmentType } from '../../models/AppointmentType';

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
vi.stubGlobal('IntersectionObserver', NoopObserver);

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k, language: 'he' }),
}));

const LONG = 'בניית ציפורניים בג׳ל קשיח עם עיצוב אישי ואבני חן לפי בחירה של הלקוחה';
const services = [
  { _id: 'a', name: LONG, price: '260', durationMS: '5400000' },
  { _id: 'b', name: 'לק רגיל', price: '80', durationMS: '1800000' },
] as unknown as AppointmentType[];
const PRICE_LOOKS = ['ledger', 'roman', 'menu', 'board', 'table', 'tags', 'soft', 'arch', 'index'];
const CUT = /truncate|line-clamp|text-ellipsis/;

/** LT-538 (Erel): every section in its style's manner, on the same content. */
describe.each(PRICE_LOOKS)('the %s price list', (look) => {
  it('shows every service whole, with its price', () => {
    const { container } = render(<ServicesLedger appointmentTypes={services} tone="bg" look={look} />);
    expect(screen.getByRole('heading', { name: LONG })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'לק רגיל' })).toBeInTheDocument();
    expect(container.textContent).toMatch(/260/);
    expect(container.textContent).toMatch(/80/);
    expect(container.innerHTML).not.toMatch(CUT);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('marks the name and the price for the site editor', () => {
    const { container } = render(<EditContext.Provider value={{ editing: true }}><ServicesLedger appointmentTypes={services} tone="bg" look={look} /></EditContext.Provider>);
    expect(container.querySelector('[data-lt-edit="services.a.name"]')).not.toBeNull();
    expect(container.querySelector('[data-lt-edit="services.a.price"]')).not.toBeNull();
  });
});

describe('the table', () => {
  it('leads to the calendar, or to the contact form on a site without one', () => {
    const { rerender } = render(<ServicesLedger appointmentTypes={services} tone="bg" look="table" />);
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '#schedule');
    rerender(<ServicesLedger appointmentTypes={services} tone="bg" look="table" bookable={false} />);
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '#contact');
  });
});

describe('the roman list', () => {
  it('counts in roman numerals', () => {
    const { container } = render(<ServicesLedger appointmentTypes={services} tone="bg" look="roman" />);
    expect(container.textContent).toContain('II');
  });
});

describe.each(['band', 'poster', 'slant', 'quiet', 'card', 'ticket', 'split'])('the %s booking band', (look) => {
  it('says its line and leads to the calendar, in the owner\'s words', () => {
    render(<BookingBand statement="יש לנו מקום פנוי השבוע" label="לקביעת תור" look={look} />);
    expect(screen.getByRole('heading', { name: 'יש לנו מקום פנוי השבוע' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /לקביעת תור/ })).toHaveAttribute('href', '#schedule');
  });
});

describe.each(['display', 'ruled', 'outline', 'marker', 'soft'])('the %s statement', (look) => {
  it('sets the whole line, and the editor can reach it', () => {
    const { container } = render(<EditContext.Provider value={{ editing: true }}><Manifesto text="טיפוח מדויק, בלי פשרות" basePath="blocks.m.props" look={look} /></EditContext.Provider>);
    expect(container.querySelector('[data-lt-edit="blocks.m.props.text"]')?.textContent).toBe('טיפוח מדויק, בלי פשרות');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Schedule from '../../components/Layout/Schedule/Schedule';
import { AppointmentType } from '../../models/AppointmentType';

/**
 * LT-356 — the booking flow for keyboard and screen-reader visitors: each
 * step takes the focus (the control that advanced it is gone) and says which
 * step it is; the month buttons have names; the chosen day is "pressed".
 */

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
vi.stubGlobal('IntersectionObserver', NoopObserver);
Element.prototype.scrollIntoView = vi.fn();

vi.mock('@marsidev/react-turnstile', () => ({ Turnstile: (): null => null }));
vi.mock('../../services/AuthService', () => ({ default: { handshake: vi.fn().mockResolvedValue(true) } }));
vi.mock('../../services/AppointmentService', () => ({
  default: { getInstance: () => ({ getCalendar: vi.fn().mockResolvedValue({ busy: [], classes: [] }), getAvailability: vi.fn() }) },
}));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${Object.values(params).join(' ')}` : key),
    language: 'he',
  }),
}));

const SERVICES = [AppointmentType.fromJSON({ _id: 's1', name: 'Haircut', price: '100', durationMS: '2400000' })];
const OPEN_EVERY_DAY = Array(7).fill('09:00-17:00');

const renderFlow = () => render(
  <Schedule
    config={{ title: 'Book', description: '' } as never}
    workingDays={OPEN_EVERY_DAY}
    user_id="u1"
    phone="050-0000000"
    businessName="Studio"
    timeToCancel={3600000}
    vacations={[]}
    appointmentTypes={SERVICES}
    isPreview
  />,
);

describe('the booking flow for keyboard and screen readers (LT-356)', () => {
  it('names the step it is on, and moves the focus to it on each advance', () => {
    renderFlow();
    expect(screen.getByRole('group', { name: /^a11y\.booking\.step 1 5 schedule\.select\.type$/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Haircut/ }));
    const dateStep = screen.getByRole('group', { name: /^a11y\.booking\.step 2 5 schedule\.select\.date$/ });
    expect(document.activeElement).toBe(dateStep);

    expect(screen.getByRole('button', { name: 'a11y.booking.nextMonth' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'a11y.booking.prevMonth' })).toBeInTheDocument();

    const day = dateStep.querySelector<HTMLButtonElement>('.grid button:not([disabled])')!;
    expect(day).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(day);
    expect(document.activeElement).toBe(screen.getByRole('group', { name: /^a11y\.booking\.step 3 5 schedule\.select\.time$/ }));

    const slot = screen.getAllByRole('button').find((b) => /^\s*\d{2}:\d{2}\s*$/.test(b.textContent ?? ''))!;
    fireEvent.click(slot);
    expect(document.activeElement).toBe(screen.getByRole('group', { name: /^a11y\.booking\.step 4 5 a11y\.booking\.details$/ }));
  });

  it('a service card holds no heading (a heading inside a button is not allowed) and reads from the start side', () => {
    renderFlow();
    const card = screen.getByRole('button', { name: /Haircut/ });
    expect(card.querySelector('h1,h2,h3,h4,h5,h6')).toBeNull();
    expect(card.querySelector('.text-start')).not.toBeNull();
  });
});

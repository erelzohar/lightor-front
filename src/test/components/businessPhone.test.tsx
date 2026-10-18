import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import ContactButton from '../../components/ContactButton';
import Contact from '../../components/Layout/Contact';
import AccessibilityStatement from '../../components/a11y/AccessibilityStatement';
import { ContactConfig } from '../../models/ContactConfig';
import { closeStatement, openStatement } from '../../services/a11yStatement';

/**
 * LT-404 - the business phone, stored as E.164 ("+972501234567") or in a
 * legacy local shape, reads "050-1234567", dials tel:+972..., and a landline
 * (no WhatsApp) shows no WhatsApp button.
 */

vi.mock('@marsidev/react-turnstile', () => ({ Turnstile: (): null => null }));
vi.mock('../../services/AuthService', () => ({ default: { handshake: vi.fn().mockResolvedValue(true) } }));
vi.mock('../../services/SmsService', () => ({ default: { sendContactMessage: vi.fn() } }));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key, language: 'en' }),
}));

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): unknown[] { return []; }
}

beforeEach(() => {
  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = NoopObserver;
  act(() => closeStatement());
});

const closedContact = (phone: string) => (
  <Contact
    config={new ContactConfig(true, 'Contact', '')}
    contact={{ phone, mail: 'a@b.co' }}
    workingDays={Array(7).fill(null)}
    layout="poster"
    conversion="lead"
    leadsOpen={false}
  />
);

describe('business phone on the site (LT-404)', () => {
  it('the floating contact button offers WhatsApp for a mobile and not for a landline', () => {
    const mobile = render(<ContactButton phone="+972501234567" />);
    fireEvent.click(screen.getByLabelText('contact.button.options'));
    expect(screen.getByText('contact.option.whatsapp')).toBeInTheDocument();
    expect(screen.getByText('contact.option.call')).toBeInTheDocument();
    mobile.unmount();

    render(<ContactButton phone="03-1234567" />);
    fireEvent.click(screen.getByLabelText('contact.button.options'));
    expect(screen.queryByText('contact.option.whatsapp')).toBeNull();
    expect(screen.getByText('contact.option.call')).toBeInTheDocument();
  });

  it('a stored +972 phone reads 050-... and dials tel:+972...', () => {
    render(closedContact('+972501234567'));
    const shown = screen.getByText('050-1234567');
    expect(screen.queryByText('+972501234567')).toBeNull();
    // A desktop click opens the call card, whose button dials the E.164.
    fireEvent.click(shown);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('050-1234567')).toBeInTheDocument();
    expect(within(dialog).getByRole('link')).toHaveAttribute('href', 'tel:+972501234567');
  });

  it('the leads-closed buttons drop WhatsApp for a landline', () => {
    const mobile = render(closedContact('050-123 4567'));
    expect(within(screen.getByTestId('contact-closed')).getByText('contact.option.whatsapp')).toBeInTheDocument();
    mobile.unmount();

    render(closedContact('+97231234567'));
    const closed = screen.getByTestId('contact-closed');
    expect(within(closed).queryByText('contact.option.whatsapp')).toBeNull();
    expect(within(closed).getByText('contact.option.call')).toBeInTheDocument();
    expect(screen.getByText('03-1234567')).toBeInTheDocument();
  });

  it('the accessibility statement shows the national form and links the E.164', () => {
    render(<AccessibilityStatement businessName="Studio" phone="+972501234567" bookable />);
    act(() => openStatement());
    expect(screen.getByRole('link', { name: '050-1234567' })).toHaveAttribute('href', 'tel:+972501234567');
  });
});

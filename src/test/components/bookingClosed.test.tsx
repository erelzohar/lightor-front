import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BookingClosed from '../../components/Layout/Schedule/BookingClosed';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

/**
 * LT-458 - while the site is not taking bookings online (the business's
 * payment failed, or its free month or plan is full) the booking form gives
 * way to call / WhatsApp buttons, like the contact form at its cap (LT-197).
 */
describe('a site not taking bookings online', () => {
  it('reads the server`s bookingClosed; absent is open', () => {
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE }).bookingOpen).toBe(true);
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, bookingClosed: null }).bookingOpen).toBe(true);
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, bookingClosed: 'paymentFailed' }).bookingOpen).toBe(false);
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, bookingClosed: 'freePeriodFull' }).bookingOpen).toBe(false);
  });

  it('offers a call, and WhatsApp for a mobile number', () => {
    render(<BookingClosed phone="0501234567" />);
    expect(screen.getByTestId('booking-closed')).toHaveTextContent('schedule.closedOnline');
    expect(screen.getByRole('button', { name: 'contact.option.call' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'contact.option.whatsapp' })).toBeInTheDocument();
  });

  it('a landline gets the call button only', () => {
    render(<BookingClosed phone="03-1234567" />);
    expect(screen.queryByRole('button', { name: 'contact.option.whatsapp' })).not.toBeInTheDocument();
  });
});

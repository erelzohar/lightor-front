import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ContactButton from '../../components/ContactButton';
import Contact from '../../components/Layout/Contact';
import About from '../../components/Layout/About';
import BookingClosed from '../../components/Layout/Schedule/BookingClosed';
import { ContactConfig } from '../../models/ContactConfig';
import { AboutConfig } from '../../models/AboutConfig';
import type { ContactLayout } from '../../models/DesignConfig';

/**
 * LT-724 - an owner may open an account without a phone, so a site's
 * `contact.phone` can be empty. Such a site shows no call button, no WhatsApp
 * button and no phone line anywhere, and leaves no hole or stray separator
 * where the phone was. A site with a phone keeps its call link.
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
});

const MOBILE = '+972501234567';
const NO_PHONES = ['', '   '];
const WEEK: (string | null)[] = [null, '09:00-17:00', null, null, null, null, null];

/** Nothing on the page dials or chats, and no call / WhatsApp / phone label. */
const expectNoPhone = (root: HTMLElement = document.body) => {
  expect(root.querySelector('a[href^="tel:"]')).toBeNull();
  expect(root.querySelector('a[href*="wa.me"]')).toBeNull();
  const text = root.textContent ?? '';
  expect(text).not.toContain('contact.option.call');
  expect(text).not.toContain('contact.option.whatsapp');
  expect(text).not.toContain('about.phone');
};

/** A desktop click opens the call card; its link dials the business. */
const expectCallCard = async () => {
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByRole('link')).toHaveAttribute('href', 'tel:+972501234567');
};

const contact = (phone: string, layout?: ContactLayout, leadsOpen = true) => (
  <Contact
    config={new ContactConfig(true, 'Contact', '')}
    contact={{ phone, mail: 'a@b.co' }}
    workingDays={WEEK}
    layout={layout}
    conversion="lead"
    leadsOpen={leadsOpen}
  />
);

const aboutConfig = AboutConfig.fromJSON({ visible: true, title: 'About', description: '', paragraphs: { intro: 'Hello', mission: '' }, features: [] });
const site = (phone: string, instagram = '') => ({ address: {}, contact: { phone, mail: 'a@b.co' }, social: { instagram, facebook: '', tiktok: '' }, workingDays: WEEK }) as never;

describe('a site with no phone (LT-724)', () => {
  describe('the floating contact button', () => {
    it.each(NO_PHONES)('offers no call and no WhatsApp for %j, the report option stays', (phone) => {
      render(<ContactButton phone={phone} />);
      fireEvent.click(screen.getByLabelText('contact.button.options'));
      expectNoPhone();
      expect(screen.getByText('contact.option.report')).toBeInTheDocument();
    });

    it('with a phone: call and WhatsApp as before, the call dials the number', async () => {
      render(<ContactButton phone={MOBILE} />);
      fireEvent.click(screen.getByLabelText('contact.button.options'));
      expect(screen.getByText('contact.option.whatsapp')).toBeInTheDocument();
      fireEvent.click(screen.getByText('contact.option.call'));
      await expectCallCard();
    });
  });

  describe('the contact section', () => {
    it.each(NO_PHONES)('default layout: no phone card for %j, only the mail card', (phone) => {
      render(contact(phone));
      expectNoPhone();
      const list = screen.getByRole('list', { name: 'nav.contact' });
      const items = within(list).getAllByRole('listitem');
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveTextContent('a@b.co');
    });

    it('default layout with a phone: the phone card dials the number', async () => {
      render(contact(MOBILE));
      expect(within(screen.getByRole('list', { name: 'nav.contact' })).getAllByRole('listitem')).toHaveLength(2);
      fireEvent.click(screen.getByText('050-1234567'));
      await expectCallCard();
    });

    it.each(['editorial', 'band', 'cards', 'bubbles', 'poster'] as const)('%s: no phone line, the mail and hours stay', (layout) => {
      render(contact('', layout));
      expectNoPhone();
      expect(screen.getByText('a@b.co')).toBeInTheDocument();
      expect(document.body.textContent).toContain('day.1: 9:00 AM');
    });

    it.each(['editorial', 'band', 'cards', 'bubbles', 'poster'] as const)('%s with a phone: the phone line dials the number', async (layout) => {
      render(contact(MOBILE, layout));
      fireEvent.click(screen.getByText('050-1234567'));
      await expectCallCard();
    });

    it('poster: no big number and no gap above the lines', () => {
      const { container } = render(contact('', 'poster'));
      const column = container.querySelector('.md\\:pe-12') as HTMLElement;
      expect(column.querySelector('button')).toBeNull();
      expect((column.firstElementChild as HTMLElement).className).not.toContain('mt-8');
    });

    it('statement: no phone and no stray separator', () => {
      const none = render(contact('', 'statement'));
      expectNoPhone();
      expect(screen.getByText('a@b.co')).toBeInTheDocument();
      expect(none.container.textContent).not.toContain('·');
      none.unmount();

      render(contact(MOBILE, 'statement'));
      expect(document.body.textContent).toContain('·');
      expect(screen.getByText('050-1234567')).toBeInTheDocument();
    });

    it('leads closed: no empty row of buttons', () => {
      render(contact('', 'editorial', false));
      const closed = screen.getByTestId('contact-closed');
      expectNoPhone(closed);
      expect(closed.querySelectorAll('button')).toHaveLength(0);
      expect(closed.children).toHaveLength(1);
      expect(within(closed).getByText('contact.closedNoPhone')).toBeInTheDocument();
      expect(within(closed).queryByText('contact.closed')).toBeNull();
    });

    it('leads closed with a phone: call and WhatsApp as before', async () => {
      render(contact(MOBILE, 'editorial', false));
      const closed = screen.getByTestId('contact-closed');
      expect(within(closed).getByText('contact.closed')).toBeInTheDocument();
      expect(within(closed).queryByText('contact.closedNoPhone')).toBeNull();
      expect(within(closed).getByText('contact.option.whatsapp')).toBeInTheDocument();
      fireEvent.click(within(closed).getByText('contact.option.call'));
      await expectCallCard();
    });
  });

  describe('the about section', () => {
    it.each(NO_PHONES)('no phone card and no call button for %j, the mail and hours cards stay', (phone) => {
      render(<About config={aboutConfig} websiteConfig={site(phone, 'https://instagram.com/x')} />);
      expectNoPhone();
      expect(screen.getByText('a@b.co')).toBeInTheDocument();
      expect(screen.getByText('about.hours')).toBeInTheDocument();
      expect(screen.getByLabelText('footer.social.follow.instagram')).toBeInTheDocument();
    });

    it('with a phone: the phone card and the call button dial the number', async () => {
      render(<About config={aboutConfig} websiteConfig={site(MOBILE)} />);
      expect(screen.getByText('about.phone')).toBeInTheDocument();
      expect(screen.getByLabelText('contact.option.call')).toBeInTheDocument();
      fireEvent.click(screen.getByText('050-1234567'));
      await expectCallCard();
    });
  });

  describe('booking closed', () => {
    it.each(NO_PHONES)('no buttons for %j, the words stay', (phone) => {
      render(<BookingClosed phone={phone} />);
      const card = screen.getByTestId('booking-closed');
      expectNoPhone(card);
      expect(card.querySelectorAll('button')).toHaveLength(0);
      expect(within(card).getByText('schedule.closedOnlineNoPhone')).toBeInTheDocument();
      expect(within(card).queryByText('schedule.closedOnline')).toBeNull();
    });

    it('with a phone: the call button dials the number', async () => {
      render(<BookingClosed phone={MOBILE} />);
      expect(screen.getByText('schedule.closedOnline')).toBeInTheDocument();
      expect(screen.queryByText('schedule.closedOnlineNoPhone')).toBeNull();
      expect(screen.getByRole('button', { name: 'contact.option.whatsapp' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'contact.option.call' }));
      await expectCallCard();
    });
  });
});

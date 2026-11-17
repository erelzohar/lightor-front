import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { choose } from '../helpers/dropdown';
import Contact from '../../components/Layout/Contact';
import { ContactConfig } from '../../models/ContactConfig';
import { resetVisitorPassForTests } from '../../services/visitorPass';
import { resetPhoneCountriesForTests } from '../../services/phoneCountries';

/**
 * LT-677 - the lead form with a number abroad. No code is sent here, so the
 * form takes an Israeli mobile (as always, sent as typed), a number of an
 * open country abroad, or any number written with "+" and a country code;
 * the last two are sent in E.164.
 */

const mocks = vi.hoisted(() => ({
  sendContactMessage: vi.fn(),
  handshake: vi.fn(),
}));

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
vi.stubGlobal('IntersectionObserver', NoopObserver);
Element.prototype.scrollIntoView = vi.fn();

vi.mock('../../services/SmsService', () => ({ default: { sendContactMessage: mocks.sendContactMessage } }));
vi.mock('@marsidev/react-turnstile', async () => {
  const React = await import('react');
  return {
    Turnstile: ({ onSuccess }: { onSuccess?: (token: string) => void }): null => {
      // Once, on mount, as a real widget does.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      React.useEffect(() => { onSuccess?.('test-token'); }, []);
      return null;
    },
  };
});
vi.mock('../../services/AuthService', () => ({ default: { handshake: mocks.handshake } }));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) => (vars && 'example' in vars ? `${key}:${vars.example}` : key),
    language: 'en',
  }),
}));

const renderForm = (businessPhone = '050-1234567') =>
  render(
    <Contact
      config={new ContactConfig(true, 'Contact', '')}
      contact={{ phone: businessPhone, mail: 'shop@example.com' }}
      workingDays={Array(7).fill(null)}
      layout="editorial"
    />
  );

/** An example number inside a sentence: wrapped in marks that keep it left to right. */
const example = (number: string) => `\u2066${number}\u2069`;
const phoneInput = () => screen.getByLabelText('contact.form.phone') as HTMLInputElement;
const chip = () => screen.getByRole('button', { name: 'phone.chip' });
const queryChip = () => screen.queryByRole('button', { name: 'phone.chip' });
const form = (): HTMLFormElement => document.querySelector('form') as HTMLFormElement;
const fill = (phone: string) => {
  fireEvent.change(screen.getByLabelText('contact.form.name'), { target: { value: 'Dana' } });
  fireEvent.change(phoneInput(), { target: { value: phone } });
};
const sent = async () => {
  await waitFor(() => expect(mocks.sendContactMessage).toHaveBeenCalledTimes(1));
  return mocks.sendContactMessage.mock.calls[0][1] as { phone: string };
};

describe('the lead form with a number abroad (LT-677)', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
    mocks.sendContactMessage.mockResolvedValue({ ok: true });
    mocks.handshake.mockResolvedValue(true);
    resetVisitorPassForTests();
    resetPhoneCountriesForTests();
  });
  afterEach(() => resetPhoneCountriesForTests());

  describe('while no country abroad is open', () => {
    it('is the form as it always was: no chip, digits only, the Israeli checks, the number as typed', async () => {
      renderForm('+12125550123');
      expect(queryChip()).toBeNull();
      expect(phoneInput().hasAttribute('dir')).toBe(false);
      expect(phoneInput().hasAttribute('placeholder')).toBe(false);
      expect(phoneInput().getAttribute('style')).toBeNull();

      // A plus cannot even be typed, so no number abroad passes.
      fill('+44 7911 123456');
      expect(phoneInput().value).toBe('4479111234');
      fireEvent.submit(form());
      expect(await screen.findByText('contact.validation.phone.start')).toBeTruthy();
      expect(mocks.sendContactMessage).not.toHaveBeenCalled();

      fill('050-123 4567');
      expect(phoneInput().value).toBe('0501234567');
      fireEvent.submit(form());
      expect((await sent()).phone).toBe('0501234567');
    });

    it.each([
      ['031234567', 'contact.validation.phone.start'],
      ['050123456', 'contact.validation.phone.length'],
    ])('refuses %s with the text it always had', async (phone, text) => {
      renderForm();
      fill(phone);
      fireEvent.submit(form());
      expect(await screen.findByText(text)).toBeTruthy();
      expect(mocks.sendContactMessage).not.toHaveBeenCalled();
    });
  });

  describe('with the US open', () => {
    beforeEach(() => resetPhoneCountriesForTests({ offered: ['IL', 'US'] }));

    it('sends an Israeli number as it was typed, as always', async () => {
      renderForm();
      expect(chip()).toBeTruthy();
      fill('0501234567');
      fireEvent.submit(form());
      expect((await sent()).phone).toBe('0501234567');
    });

    it('sends a US number in E.164', async () => {
      renderForm();
      fill('0501234567');
      choose(chip(), 'US');
      fireEvent.change(phoneInput(), { target: { value: '2125550123' } });
      expect(phoneInput().value).toBe('(212) 555-0123');
      expect(phoneInput().getAttribute('dir')).toBe('ltr');
      fireEvent.submit(form());
      expect((await sent()).phone).toBe('+12125550123');
    });

    it("starts on the site's own country", () => {
      renderForm('+15125550100');
      expect(screen.getByTestId('phone-chip-face').textContent).toBe('+1');
      expect(phoneInput().placeholder).toBe('(212) 555-0123');
    });

    it('a pasted +1 number moves the chip and is sent in E.164', async () => {
      renderForm();
      fill('+1 212-555-0123');
      expect(screen.getByTestId('phone-chip-face').textContent).toBe('+1');
      expect(phoneInput().value).toBe('(212) 555-0123');
      fireEvent.submit(form());
      expect((await sent()).phone).toBe('+12125550123');
    });

    it('takes any number written with a plus and a country code, though its country is not on offer', async () => {
      renderForm();
      fill('+44 7911 123456');
      expect(phoneInput().value).toBe('+447911123456');
      fireEvent.submit(form());
      expect((await sent()).phone).toBe('+447911123456');
    });

    it.each([
      ['+44', 'IL', `phone.validation.invalid:${example('0501234567')}`],
      ['21255501', 'US', `phone.validation.invalid:${example('(212) 555-0123')}`],
    ])('refuses %s, which is not a whole number', async (phone, country, text) => {
      renderForm();
      fill('0501234567');
      if (country === 'US') choose(chip(), 'US');
      fireEvent.change(phoneInput(), { target: { value: phone } });
      fireEvent.submit(form());
      expect(await screen.findByText(text)).toBeTruthy();
      expect(mocks.sendContactMessage).not.toHaveBeenCalled();
    });

    it("says the server's refusal of a number abroad on the field", async () => {
      mocks.sendContactMessage.mockResolvedValue({ ok: false, status: 400, code: 'PHONE_INVALID' });
      renderForm('+15125550100');
      fill('2125550123');
      fireEvent.submit(form());
      expect(await screen.findByText(`phone.validation.invalid:${example('(212) 555-0123')}`)).toBeTruthy();
      expect(phoneInput().getAttribute('aria-invalid')).toBe('true');
      expect(screen.queryByText('schedule.genericError')).toBeNull();
    });

    it('has no accessibility violation axe can see with the chip open', async () => {
      renderForm();
      fireEvent.click(chip());
      const result = await axe.run(document.body, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      });
      expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  });
});

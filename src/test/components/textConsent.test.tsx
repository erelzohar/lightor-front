import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import TextConsent, { textConsentLinks } from '../../components/Layout/Schedule/TextConsent';
import scheduleSource from '../../components/Layout/Schedule/Schedule.tsx?raw';
import enRaw from '../../i18n/locales/en/translation.json?raw';
import heRaw from '../../i18n/locales/he/translation.json?raw';
import arRaw from '../../i18n/locales/ar/translation.json?raw';
import frRaw from '../../i18n/locales/fr/translation.json?raw';
import esRaw from '../../i18n/locales/es/translation.json?raw';

/**
 * LT-687 - the line a customer with a United States number agrees to, under
 * the booking form's button. The carriers that approve a sending number look
 * at this line itself for who texts, the rates notice and STOP, and for two
 * links to pages that each have a section on text messages.
 */
let lang = 'en';
const RAW: Record<string, string> = { en: enRaw, he: heRaw, ar: arRaw, fr: frRaw, es: esRaw };
/** The locale files start with a byte-order mark. */
const locale = (code: string) => JSON.parse(RAW[code].charCodeAt(0) === 0xfeff ? RAW[code].slice(1) : RAW[code]);
const read = (tree: Record<string, unknown>, key: string): string =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], tree) as string;

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => read(locale(lang), key), language: lang }),
}));

const LANGUAGES = ['en', 'he', 'ar', 'fr', 'es'];

describe('the text consent line (LT-687)', () => {
  it('says in English who texts, that rates may apply and how to stop, with a link to each page`s own section', () => {
    lang = 'en';
    render(<TextConsent channel="sms" />);
    const line = screen.getByTestId('text-consent');
    expect(line).toHaveTextContent(
      'By tapping the button you agree to get appointment texts from Lightor. Msg & data rates may apply. Reply STOP to opt out. Terms · Privacy',
    );
    expect(line.textContent).not.toMatch(/on behalf of/i);

    const terms = screen.getByRole('link', { name: 'Terms' });
    const privacy = screen.getByRole('link', { name: 'Privacy' });
    expect(terms).toHaveAttribute('href', 'https://lightor.app/terms.html#en-sms');
    expect(privacy).toHaveAttribute('href', 'https://lightor.app/privacy.html#en-sms');
    for (const link of [terms, privacy]) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('with WhatsApp chosen still tells of the code by text, since a code abroad always is one', () => {
    lang = 'en';
    render(<TextConsent channel="whatsapp" />);
    expect(screen.getByTestId('text-consent')).toHaveTextContent(
      'By tapping the button you agree to get a code by text and appointment messages on WhatsApp from Lightor. Msg & data rates may apply. Terms · Privacy',
    );
  });

  it('a Hebrew site links to the Hebrew sections, every other language to the English ones', () => {
    expect(textConsentLinks('he')).toEqual({
      terms: 'https://lightor.app/terms.html#he-sms',
      privacy: 'https://lightor.app/privacy.html#he-sms',
    });
    for (const code of ['en', 'ar', 'fr', 'es']) expect(textConsentLinks(code).terms).toBe('https://lightor.app/terms.html#en-sms');
  });

  it.each(LANGUAGES)('%s: names Lightor, keeps STOP as the word to send, and has no dash', (code) => {
    const form = locale(code).schedule.form as Record<string, string>;
    for (const key of ['consentSms', 'consentWhatsapp', 'consentTerms', 'consentPrivacy']) {
      expect(form[key], `${code}.${key}`).toBeTruthy();
      expect(form[key]).not.toMatch(/[–—]/);
    }
    expect(form.consentSms).toContain('Lightor');
    expect(form.consentSms).toContain('STOP');
    expect(form.consentWhatsapp).toContain('Lightor');
  });

  it.each(LANGUAGES)('%s: passes the accessibility check', async (code) => {
    lang = code;
    const { container } = render(
      <main lang={code} dir={code === 'he' || code === 'ar' ? 'rtl' : 'ltr'}>
        <TextConsent channel="sms" />
      </main>,
    );
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it('the booking form shows it for a United States number, and the plain line otherwise', () => {
    expect(scheduleSource).toMatch(
      /phoneInput\.country === 'US' \? \(\s*<TextConsent channel=\{channelType\} \/>\s*\) : \(\s*<p[^>]*>\s*\{t\('schedule\.form\.helper'\)\}/,
    );
  });
});

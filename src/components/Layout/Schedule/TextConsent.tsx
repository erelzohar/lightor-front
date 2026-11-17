import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';

/**
 * LT-687 - what a customer with a United States number agrees to, under the
 * booking form's button, in place of the plain "a code will be sent" line.
 *
 * In the US a text from software needs the customer's agreement, given where
 * they give the number, and the carriers that approve a sending number look
 * at this very line for three things that may not sit only behind a link:
 * who texts (Lightor), "Msg & data rates may apply", and "Reply STOP". The
 * rest is in Lightor's terms and privacy policy, each linked to its own
 * section on text messages. Lightor is the sender, of its own message about
 * a booking made through it; the line never says "on behalf of".
 *
 * A code to a number abroad always goes by text, so the line is about texts
 * whichever way the customer chose to get the later messages; with WhatsApp
 * chosen it says both.
 */

const LEGAL = 'https://lightor.app';

/** The two pages' sections on text messages: Hebrew for a Hebrew site, English for every other language. */
export const textConsentLinks = (language: string): { terms: string; privacy: string } => {
  const section = language === 'he' ? 'he-sms' : 'en-sms';
  return { terms: `${LEGAL}/terms.html#${section}`, privacy: `${LEGAL}/privacy.html#${section}` };
};

const LINK =
  'underline underline-offset-2 rounded-sm hover:text-light-text dark:hover:text-dark-text ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary';

const TextConsent: React.FC<{ channel: 'sms' | 'whatsapp' }> = ({ channel }) => {
  const { t, language } = useLanguage();
  const links = textConsentLinks(language);
  return (
    <p className="mt-4 text-xs text-light-text/60 dark:text-dark-text/50 text-center" data-testid="text-consent">
      {t(channel === 'whatsapp' ? 'schedule.form.consentWhatsapp' : 'schedule.form.consentSms')}{' '}
      <a href={links.terms} target="_blank" rel="noopener noreferrer" className={LINK}>
        {t('schedule.form.consentTerms')}
      </a>
      {' · '}
      <a href={links.privacy} target="_blank" rel="noopener noreferrer" className={LINK}>
        {t('schedule.form.consentPrivacy')}
      </a>
    </p>
  );
};

export default TextConsent;

import React, { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import {
  ACCESSIBILITY_CONTACT, STATEMENT_HASH, STATEMENT_UPDATED,
  closeStatement, isStatementOpen, openStatement, subscribeStatement,
} from '../../services/a11yStatement';

interface AccessibilityStatementProps {
  businessName: string;
  phone?: string;
  /** A booking site offers booking by phone; a leads site, contact by phone. */
  bookable: boolean;
}

const DONE_KEYS = ['done1', 'done2', 'done3', 'done4', 'done5', 'done6'] as const;

/**
 * LT-346: the site's accessibility statement (Israeli regulation 35ה), the
 * same on every Lightor site apart from the business's name and phone. The
 * contact is always EZ Webs (LT-339 D4). Opened from the footer, the strip
 * under the page and the accessibility menu, or by `/#accessibility`.
 */
const AccessibilityStatement: React.FC<AccessibilityStatementProps> = ({ businessName, phone, bookable }) => {
  const { t, language } = useLanguage();
  const open = useSyncExternalStore(subscribeStatement, isStatementOpen, isStatementOpen);
  const boxRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogFocus(open, boxRef, closeStatement);

  // `/#accessibility` (a shared link, or a link followed in a new tab).
  useEffect(() => {
    const check = () => { if (window.location.hash === STATEMENT_HASH) openStatement(); };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, []);

  if (!open) return null;

  let updated = STATEMENT_UPDATED;
  try {
    updated = new Intl.DateTimeFormat(language, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${STATEMENT_UPDATED}T00:00:00Z`));
  } catch { /* keep the ISO date */ }
  const tel = phone?.replace(/[^0-9+]/g, '');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) closeStatement(); }}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="lt-ui relative w-full max-w-2xl max-h-[85svh] overflow-y-auto overflow-x-hidden rounded-2xl bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text p-6 md:p-8 shadow-2xl text-start"
      >
        <button
          type="button"
          onClick={closeStatement}
          aria-label={t('a11y.menu.close')}
          className="absolute top-3 end-3 p-2 rounded-full hover:bg-light-gray dark:hover:bg-dark-gray"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <h2 id={titleId} className="font-bold mb-4 pe-10 break-words">{t('a11y.statement.title')}</h2>
        <p className="mb-5 leading-relaxed">{t('a11y.statement.intro', { name: businessName })}</p>

        <h3 className="font-semibold mb-2">{t('a11y.statement.levelTitle')}</h3>
        <p className="mb-5 leading-relaxed">{t('a11y.statement.level')}</p>

        <h3 className="font-semibold mb-2">{t('a11y.statement.doneTitle')}</h3>
        <ul className="mb-5 list-disc ps-6 space-y-1 leading-relaxed">
          {DONE_KEYS.map((k) => <li key={k}>{t(`a11y.statement.${k}`)}</li>)}
        </ul>

        <h3 className="font-semibold mb-2">{t('a11y.statement.limitsTitle')}</h3>
        <p className="mb-5 leading-relaxed">{t('a11y.statement.limits')}</p>

        <h3 className="font-semibold mb-2">{t('a11y.statement.contactTitle')}</h3>
        <p className="mb-2 leading-relaxed">
          {t(bookable ? 'a11y.statement.contact' : 'a11y.statement.contactLead', { name: ACCESSIBILITY_CONTACT.name.replace(' ', '\u00a0') })}{' '}
          <a href={`mailto:${ACCESSIBILITY_CONTACT.email}`} className="underline underline-offset-2 text-primary-readable dark:text-primary-dark-readable">
            <bdi>{ACCESSIBILITY_CONTACT.email}</bdi>
          </a>
          {'. '}
          {t('a11y.statement.reply')}
        </p>
        {tel && (
          <p className="mb-5 leading-relaxed">
            {t(bookable ? 'a11y.statement.phone' : 'a11y.statement.phoneLead')}{' '}
            <a href={`tel:${tel}`} className="underline underline-offset-2 text-primary-readable dark:text-primary-dark-readable"><bdi>{phone}</bdi></a>
          </p>
        )}

        <p className="text-sm opacity-75">{t('a11y.statement.updated', { date: updated })}</p>
      </div>
    </div>
  );
};

export default AccessibilityStatement;

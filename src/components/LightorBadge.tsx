import React from 'react';
import { Zap } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { STATEMENT_HASH, onStatementLinkClick } from '../services/a11yStatement';

interface LightorBadgeProps {
  /** The "Built with Lightor" link — free-plan sites (LT-032). */
  badge?: boolean;
  /** LT-346: the accessibility statement's link, when no footer carries it. */
  statementLink?: boolean;
}

/**
 * "Built with Lightor" (LT-032) — shown on free-plan sites, removed on upgrade.
 * Rendered independently of the footer on purpose: the footer's visibility is
 * a design choice the owner controls, the badge is not. LT-503 (Erel
 * 2026-10-31): it floats at the bottom of the screen all the way down, under
 * the menus and windows, and the page's end keeps a strip for it to land on,
 * so it never covers the last line. LT-346: on a page without a footer the
 * strip also holds the accessibility statement's link.
 */
const LightorBadge: React.FC<LightorBadgeProps> = ({ badge = true, statementLink = false }) => {
  const { t } = useLanguage();
  if (!badge && !statementLink) return null;

  return (
    <>
      <div className={`w-full px-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs bg-dark-bg text-dark-text/70 ${statementLink ? 'pt-3' : ''} ${badge ? 'pb-16' : 'pb-3'}`}>
        {statementLink && (
          <a href={STATEMENT_HASH} onClick={onStatementLinkClick} className="underline-offset-2 hover:underline">
            {t('a11y.menu.statement')}
          </a>
        )}
      </div>
      {badge && (
        <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center pointer-events-none print:hidden">
          <a
            href="https://register.lightor.app?ref=badge"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs bg-dark-bg text-dark-text border border-white/15 shadow-lg hover:text-primary transition-colors"
          >
            <Zap size={14} className="text-primary shrink-0" aria-hidden="true" />
            <span>{t('badge.builtWith')}</span>
          </a>
        </div>
      )}
    </>
  );
};

export default LightorBadge;

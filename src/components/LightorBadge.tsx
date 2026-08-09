import React from 'react';
import { Zap } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * "Built with Lightor" strip (LT-032) — shown on free-plan sites, removed on
 * upgrade. Rendered independently of the footer on purpose: the footer's
 * visibility is a design choice the owner controls, the badge is not.
 */
const LightorBadge: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="w-full py-3 px-4 flex items-center justify-center gap-1.5 text-xs bg-dark-bg text-dark-text/70">
      <a
        href="https://register.lightor.app?ref=badge"
        target="_blank"
        rel="noopener"
        className="flex items-center gap-1.5 hover:text-primary transition-colors"
      >
        <Zap size={14} className="text-primary shrink-0" />
        <span>{t('badge.builtWith')}</span>
      </a>
    </div>
  );
};

export default LightorBadge;

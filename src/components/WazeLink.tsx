import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { wazeHref } from '../utils/navigation';
import { WazeIcon } from './common/WazeIcon';

/** "Navigate with Waze" under a business address (LT-320). */
const WazeLink: React.FC<{ address: string; className?: string }> = ({ address, className = '' }) => {
  const { t } = useLanguage();
  return (
    <a
      href={wazeHref(address)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-sm font-semibold text-primary-readable dark:text-primary-dark-readable hover:underline ${className}`}
    >
      <WazeIcon className="h-4 w-4 shrink-0" />
      <span>{t('about.waze')}</span>
    </a>
  );
};

export default WazeLink;

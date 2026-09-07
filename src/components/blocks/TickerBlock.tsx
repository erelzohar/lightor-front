import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { trackFor } from './blockUtils';

interface Props { items: string[] }

/** LT-136: the standalone services strip — a shop sign, placeable anywhere. */
const TickerBlock: React.FC<Props> = ({ items }) => {
  const { language } = useLanguage();
  const source = items.filter(Boolean);
  if (!source.length) return null;
  const text = Array.from({ length: Math.ceil(28 / source.length) }, () => source).flat().join('  ·  ');
  return (
    <section aria-label={source.join(', ')} className={`overflow-hidden whitespace-nowrap py-3 bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark text-sm font-bold uppercase select-none ${trackFor(language)}`}>
      <span aria-hidden="true">{text}</span>
    </section>
  );
};
export default TickerBlock;

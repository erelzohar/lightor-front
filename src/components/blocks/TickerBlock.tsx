import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import MarqueeStrip from '../MarqueeStrip';
import { trackFor } from './blockUtils';

interface Props { items: string[] }

/** LT-136: the standalone services strip — a shop sign, placeable anywhere.
 *  Rolls continuously since LT-164; the section's aria-label carries the
 *  services for screen readers, the moving text is decoration. */
const TickerBlock: React.FC<Props> = ({ items }) => {
  const { language } = useLanguage();
  const source = items.filter(Boolean);
  if (!source.length) return null;
  return (
    <section aria-label={source.join(', ')} className={`py-3 bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark text-sm font-bold uppercase select-none ${trackFor(language)}`}>
      <MarqueeStrip items={source} />
    </section>
  );
};
export default TickerBlock;

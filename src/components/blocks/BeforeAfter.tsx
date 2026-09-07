import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import ImagesService from '../../services/ImagesService';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG, trackFor } from './blockUtils';

interface Item { url: string; title?: string }
interface Props { items: Item[]; tone?: SectionTone }

/** LT-136: two images side by side with before / after labels. */
const BeforeAfter: React.FC<Props> = ({ items, tone = 'surface' }) => {
  const { t, language } = useLanguage();
  const pair = items.filter((i) => i?.url).slice(0, 2);
  if (pair.length < 2) return null;
  const labels = [
    t('blocks.before', { defaultValue: language === 'he' ? 'לפני' : 'Before' }),
    t('blocks.after', { defaultValue: language === 'he' ? 'אחרי' : 'After' }),
  ];
  return (
    <section className={`section-y ${TONE_BG[tone]} transition-colors duration-300`} aria-label={labels.join(' / ')}>
      <div className="container mx-auto px-4 grid grid-cols-2 gap-3 md:gap-6">
        {pair.map((i, k) => (
          <figure key={k} className="relative m-0 aspect-[4/5] overflow-hidden rounded-design-card">
            <img src={ImagesService.getInstance().getImage(i.url)} alt={i.title ?? labels[k]} className="w-full h-full object-cover" loading="lazy" />
            <figcaption className={`absolute top-3 start-3 px-3 py-1 rounded-full text-xs font-bold uppercase bg-light-bg/90 text-light-text dark:bg-dark-bg/90 dark:text-dark-text ${trackFor(language, 'tracking-widest')}`}>
              {labels[k]}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};
export default BeforeAfter;

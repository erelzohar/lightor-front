import React from 'react';
import ImagesService from '../../services/ImagesService';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG } from './blockUtils';

interface Item { url: string; title?: string; description?: string }
interface Props { items: Item[]; tone?: SectionTone; variant?: string }

/** LT-136: two photos, offset or stacked, with one caption line. */
const PhotoPair: React.FC<Props> = ({ items, tone = 'bg', variant = 'offset' }) => {
  const pair = items.filter((i) => i?.url).slice(0, 2);
  if (pair.length < 2) return null;
  const img = (i: Item, cls: string) => (
    <img src={ImagesService.getInstance().getImage(i.url)} alt={i.title ?? ''} className={`w-full object-cover rounded-design-card ${cls}`} loading="lazy" />
  );
  const caption = pair.map((i) => i.title).filter(Boolean).join(' · ');
  return (
    <section className={`section-y ${TONE_BG[tone]} transition-colors duration-300`}>
      <div className="container mx-auto px-4">
        {variant === 'stacked' ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {img(pair[0], 'aspect-[16/10]')}
            {img(pair[1], 'aspect-[16/10]')}
          </div>
        ) : (
          <div className="grid md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-7">{img(pair[0], 'aspect-[4/3]')}</div>
            <div className="md:col-span-5 md:mt-24">{img(pair[1], 'aspect-[3/4]')}</div>
          </div>
        )}
        {caption && <p className="mt-6 text-sm text-light-text/70 dark:text-dark-text/70">{caption}</p>}
      </div>
    </section>
  );
};
export default PhotoPair;

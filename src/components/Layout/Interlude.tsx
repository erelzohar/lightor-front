import React from 'react';
import ImagesService from '../../services/ImagesService';
import { useEditAttrs } from '../../services/editMode';
import { useLanguage } from '../../contexts/LanguageContext';
import { CUTOUT_CLASS, useCutout } from '../../utils/cutout';

interface InterludeProps {
  image: string;
  statement?: string;
  /** LT-243: where the image and the statement come from (the fallbacks differ), for the site editor. */
  imagePath?: string;
  statementPath?: string;
  /** 0 = full-bleed photo with the statement over it; 1 = split photo / statement. */
  variant: 0 | 1;
  tone?: 'bg' | 'surface';
}

// LT-510 (Erel): the statement is never cut. The band grows around it, and past
// this length it drops from display size to one a paragraph can carry.
const LONG_STATEMENT = 110;

/**
 * LT-131: a photo breather between sections — the canvas pages had imagery
 * running through the page, not only in the portfolio. The statement is the
 * business's own mission line.
 */
const Interlude: React.FC<InterludeProps> = ({ image, statement, variant, tone = 'bg', imagePath, statementPath }) => {
  const ed = useEditAttrs();
  const { language } = useLanguage();
  const displayFont = language === 'he' || language === 'ar' ? 'var(--font-heading-rtl)' : 'var(--font-heading)';
  const src = ImagesService.getInstance().getImage(image);
  // A round logo here shows whole beside the statement, not cropped (LT-317).
  const cutout = useCutout(src);
  const long = (statement?.length ?? 0) > LONG_STATEMENT;

  if (variant === 1) {
    return (
      <section aria-label={statement ? undefined : 'photo'} className={`${tone === 'surface' ? 'bg-light-surface dark:bg-dark-surface' : 'bg-light-bg dark:bg-dark-bg'} transition-colors duration-300`}>
        <div className="grid md:grid-cols-2 items-stretch md:min-h-[28rem]">
          <div className="relative h-72 md:h-auto">
            <img loading="lazy" {...ed(imagePath, 'image')} src={src} alt="" data-cutout={cutout || undefined} className={cutout ? `absolute inset-0 w-full h-full p-10 ${CUTOUT_CLASS}` : 'absolute inset-0 w-full h-full object-cover'} />
          </div>
          <div className="p-10 md:p-16 flex items-center">
            {statement && (
              <p {...ed(statementPath)} className="font-bold leading-tight text-light-text dark:text-dark-text" style={{ fontFamily: displayFont, fontSize: long ? 'clamp(1.25rem, 2.2vw, 2rem)' : 'clamp(1.75rem, 3.5vw, 3.25rem)' }}>
                {statement}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative flex min-h-[max(55vh,22rem)] overflow-hidden" aria-label={statement ? undefined : 'photo'}>
      <img loading="lazy" {...ed(imagePath, 'image')} src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      {statement && (
        <div className="relative container mx-auto px-4 py-12 flex items-center justify-center text-center">
          <p {...ed(statementPath)} className="text-white font-bold leading-tight max-w-4xl" style={{ fontFamily: displayFont, fontSize: long ? 'clamp(1.375rem, 2.6vw, 2.5rem)' : 'clamp(1.75rem, 4vw, 3.75rem)' }}>
            {statement}
          </p>
        </div>
      )}
    </section>
  );
};

export default Interlude;

import React from 'react';
import ImagesService from '../../services/ImagesService';
import { useLanguage } from '../../contexts/LanguageContext';

interface InterludeProps {
  image: string;
  statement?: string;
  /** 0 = full-bleed photo with the statement over it; 1 = split photo / statement. */
  variant: 0 | 1;
  tone?: 'bg' | 'surface';
}

/**
 * LT-131: a photo breather between sections — the canvas pages had imagery
 * running through the page, not only in the portfolio. The statement is the
 * business's own mission line.
 */
const Interlude: React.FC<InterludeProps> = ({ image, statement, variant, tone = 'bg' }) => {
  const { language } = useLanguage();
  const displayFont = language === 'he' || language === 'ar' ? 'var(--font-heading-rtl)' : 'var(--font-heading)';
  const src = ImagesService.getInstance().getImage(image);

  if (variant === 1) {
    return (
      <section aria-label={statement ? undefined : 'photo'} className={`${tone === 'surface' ? 'bg-light-surface dark:bg-dark-surface' : 'bg-light-bg dark:bg-dark-bg'} transition-colors duration-300`}>
        <div className="grid md:grid-cols-2 items-stretch md:h-[28rem]">
          <img src={src} alt="" className="w-full h-72 md:h-full object-cover" />
          <div className="p-10 md:p-16 flex items-center overflow-hidden">
            {statement && (
              <p className="font-bold leading-tight text-light-text dark:text-dark-text line-clamp-5" style={{ fontFamily: displayFont, fontSize: 'clamp(1.75rem, 3.5vw, 3.25rem)' }}>
                {statement}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative h-[55vh] min-h-[22rem] overflow-hidden" aria-label={statement ? undefined : 'photo'}>
      <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      {statement && (
        <div className="relative h-full container mx-auto px-4 flex items-center justify-center text-center">
          <p className="text-white font-bold leading-tight max-w-4xl line-clamp-4" style={{ fontFamily: displayFont, fontSize: 'clamp(1.75rem, 4vw, 3.75rem)' }}>
            {statement}
          </p>
        </div>
      )}
    </section>
  );
};

export default Interlude;

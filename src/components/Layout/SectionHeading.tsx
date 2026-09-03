import React from 'react';
import type { SectionHeader } from '../../models/DesignConfig';
import { useLanguage } from '../../contexts/LanguageContext';

interface SectionHeadingProps {
  title: string;
  description?: string;
  /** Which chrome the vibe uses; 'centered' is the legacy rendering. */
  variant?: SectionHeader;
  /** Bottom margin class of the whole header block (legacy varies per section). */
  mb?: string;
  /** Classes for the description paragraph — the CENTERED variant renders it
   *  verbatim so legacy output stays byte-identical; label/side use their own. */
  descClass?: string;
  /** Optional id on the h2 (some sections are aria-labelledby it). */
  titleId?: string;
}

/**
 * LT-115: the one piece of chrome every section repeats. Before this, every
 * section on every site opened with the same centered title + accent — seven
 * times per page — which is what made different vibes read as one product.
 * The vibe's sectionHeader token now picks the chrome:
 *  - 'centered': the legacy block, byte-compatible classes.
 *  - 'label': the canvas tracked label with a rule running to the edge
 *    (industrial/underground/electric artboards).
 *  - 'side': start-aligned title + accent (atelier/gallery/heritage/earthy).
 */
const SectionHeading: React.FC<SectionHeadingProps> = ({
  title,
  description,
  variant = 'centered',
  mb = 'mb-16',
  descClass = 'text-xl text-light-text/80 dark:text-dark-text/80',
  titleId,
}) => {
  // Arabic cursive joins break under letter-spacing — the label chrome drops
  // its tracking there (review finding).
  const { language } = useLanguage();
  const track = language === 'ar' ? '' : 'tracking-[0.3em]';
  if (variant === 'label') {
    return (
      <div className={mb}>
        <div className="flex items-center gap-4">
          <h2 id={titleId} className={`section-label-title text-base font-bold ${track} uppercase text-primary-readable dark:text-primary-dark-readable`}>
            {title}
          </h2>
          <span className="flex-1 h-px bg-light-text/15 dark:bg-dark-text/15" aria-hidden="true"></span>
        </div>
        {description && (
          <p className="mt-6 max-w-2xl text-lg text-light-text/70 dark:text-dark-text/70">{description}</p>
        )}
      </div>
    );
  }

  if (variant === 'side') {
    return (
      <div className={mb}>
        <h2 id={titleId} className="text-4xl font-bold text-light-text dark:text-dark-text mb-6">{title}</h2>
        <div className="heading-accent mb-8" aria-hidden="true"></div>
        {description && <p className="max-w-2xl text-lg text-light-text/70 dark:text-dark-text/70">{description}</p>}
      </div>
    );
  }

  // 'centered' — the legacy chrome, unchanged for old presets and defaults.
  return (
    <div className={`text-center ${mb}`}>
      <h2 id={titleId} className="text-4xl font-bold text-light-text dark:text-dark-text mb-6">{title}</h2>
      <div className="heading-accent mx-auto mb-8" aria-hidden="true"></div>
      {description !== undefined && <p className={descClass}>{description}</p>}
    </div>
  );
};

export default SectionHeading;

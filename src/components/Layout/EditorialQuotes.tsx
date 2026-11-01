import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { useEditAttrs } from '../../services/editMode';
import { useStill } from '../../hooks/useA11yPrefs';
import type { TestimonialItem } from '../../models/TestimonialsConfig';

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * LT-535: 'editorial' (heritage's own): one voice at a time beside a large thin
 * number, with a row of ruled lines to pick another. It turns only when the
 * visitor turns it. A voice here is a name and its words, so the reference's
 * portrait is the name's first letter in a ring.
 */
const EditorialQuotes: React.FC<{ items: TestimonialItem[] }> = ({ items }) => {
  const { t, language } = useLanguage();
  const ed = useEditAttrs();
  const still = useStill();
  const [active, setActive] = useState(0);
  const rtl = language === 'he' || language === 'ar';
  const displayFont = rtl ? 'var(--font-heading-rtl)' : 'var(--font-heading)';
  const count = items.length;
  const at = Math.min(active, count - 1);
  const item = items[at];
  if (!item) return null;

  const shift = still ? 0 : rtl ? -16 : 16;
  const arrow = 'p-2 rounded-full text-light-text/70 dark:text-dark-text/70 hover:text-light-text dark:hover:text-dark-text hover:bg-light-text/5 dark:hover:bg-dark-text/5 transition-colors';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start gap-4 md:gap-8">
        <span dir="ltr" className="flex-none font-light leading-none tabular-nums text-7xl md:text-[7.5rem] text-light-text/15 dark:text-dark-text/15 select-none" aria-hidden="true">
          {pad(at + 1)}
        </span>
        <div className="flex-1 min-w-0 pt-2 md:pt-6" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.figure
              key={at}
              initial={{ opacity: 0, x: shift }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -shift }}
              transition={{ duration: still ? 0 : 0.3 }}
            >
              <blockquote {...ed(`components.testimonials.items.${at}.text`)} className="text-2xl md:text-3xl font-light leading-relaxed text-light-text dark:text-dark-text" style={{ fontFamily: displayFont }}>
                {item.text}
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-4">
                <span className="flex-none w-12 h-12 grid place-items-center rounded-full ring-2 ring-light-text/10 dark:ring-dark-text/10 text-lg font-medium text-primary-readable dark:text-primary-dark-readable" aria-hidden="true">
                  {item.name?.trim().charAt(0)}
                </span>
                <span {...ed(`components.testimonials.items.${at}.name`)} className="min-w-0 font-medium text-light-text dark:text-dark-text">{item.name}</span>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>
      </div>

      {count > 1 && (
        <div className="mt-10 md:mt-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 md:gap-6 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              {items.map((_, i) => (
                <button key={i} type="button" className="group py-4" aria-label={t('portfolio.slideshow_dot', { index: i + 1 })} aria-current={i === at ? 'true' : undefined} onClick={() => setActive(i)}>
                  <span className={`block h-px transition-[width,background-color] duration-500 ${i === at ? 'w-12 bg-light-text dark:bg-dark-text' : 'w-6 bg-light-text/25 dark:bg-dark-text/25 group-hover:bg-light-text/50 dark:group-hover:bg-dark-text/50'}`} />
                </button>
              ))}
            </div>
            <span dir="ltr" className="flex-none text-xs tracking-widest text-light-text/70 dark:text-dark-text/70" aria-hidden="true">{pad(at + 1)} / {pad(count)}</span>
          </div>
          <div className="flex-none flex items-center gap-1">
            <button type="button" className={arrow} aria-label={t('portfolio.slideshow_prev')} onClick={() => setActive((at - 1 + count) % count)}>
              <ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            <button type="button" className={arrow} aria-label={t('portfolio.slideshow_next')} onClick={() => setActive((at + 1) % count)}>
              <ChevronRight className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorialQuotes;

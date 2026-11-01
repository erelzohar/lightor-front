import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Calendar } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useEditAttrs } from '../../services/editMode';
import EditText from '../EditText';

interface BookingBandProps {
  /** The schedule section's description doubles as the band's statement. */
  statement: string;
  /** LT-136 'chips' variant: the services as quick picks under the statement. */
  chips?: string[];
  /** LT-199: the site's main button text, the owner's words; absent = "Book". */
  label?: string;
  /** LT-243: where the statement comes from (the block's own text or the schedule's description). */
  statementPath?: string;
  /** LT-538: how the style sets it; 'band' is the saturated strip. */
  look?: string;
}

/**
 * LT-115: the canvas full-bleed CTA band — every artboard breaks the page
 * rhythm with one saturated primary strip ("מחר בבוקר פנוי." / "Booking opens
 * monthly."); generated pages had no color break at all. Sits directly above
 * the schedule section and anchors to it.
 */
const BookingBand: React.FC<BookingBandProps> = ({ statement, chips, label, statementPath, look = 'band' }) => {
  const ed = useEditAttrs();
  const { t, language } = useLanguage();
  const buttonLabel = label?.trim() || t('hero.book');
  const rtl = language === 'he' || language === 'ar';
  const displayFont = rtl ? 'var(--font-heading-rtl)' : 'var(--font-heading)';
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const enter = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };
  const solid = 'inline-flex items-center justify-center text-center gap-3 bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark font-bold px-8 py-4 rounded-full shadow-lg transition-opacity hover:opacity-90';

  // LT-538: the band in each style's manner; the words and the way to the calendar stay.
  // 'poster' (industrial, underground): a whole block of huge type, the button an arrow.
  if (look === 'poster') {
    return (
      <section aria-label={buttonLabel} className="bg-light-text dark:bg-dark-text text-light-bg dark:text-dark-bg transition-colors duration-300">
        <motion.div className="container mx-auto px-4 py-16 md:py-24" {...enter}>
          <h2 {...ed(statementPath)} className="font-bold leading-none" style={{ fontFamily: displayFont, fontSize: 'clamp(2.5rem, 8vw, 6.5rem)', textWrap: 'balance' }}>{statement}</h2>
          <a href="#schedule" className="mt-8 inline-flex items-center gap-3 text-lg font-bold underline underline-offset-8">
            <EditText path="components.hero.cta">{buttonLabel}</EditText>
            <Arrow className="h-6 w-6" aria-hidden="true" />
          </a>
        </motion.div>
      </section>
    );
  }
  // 'slant' (electric): the strip cut on a slant, loud and tilted forward.
  if (look === 'slant') {
    return (
      <section aria-label={buttonLabel} className="bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark [clip-path:polygon(0_9%,100%_0,100%_91%,0_100%)]">
        <motion.div className="container mx-auto px-4 py-20 md:py-24 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-start" {...enter}>
          <h2 {...ed(statementPath)} className="text-3xl md:text-5xl font-bold italic leading-tight">{statement}</h2>
          <a href="#schedule" className="shrink-0 inline-flex items-center gap-3 border-2 border-current font-bold px-8 py-4 transition-opacity hover:opacity-80">
            <EditText path="components.hero.cta">{buttonLabel}</EditText>
            <Arrow className="h-5 w-5" aria-hidden="true" />
          </a>
        </motion.div>
      </section>
    );
  }
  // 'quiet' (atelier, gallery): a line between two hairlines, on the page's own colour.
  if (look === 'quiet') {
    return (
      <section aria-label={buttonLabel} className="bg-light-bg dark:bg-dark-bg transition-colors duration-300">
        <motion.div className="container mx-auto px-4 py-12 max-w-3xl text-center" {...enter}>
          <div className="py-10 border-y border-light-text/20 dark:border-dark-text/20">
            <h2 {...ed(statementPath)} className="text-2xl md:text-3xl leading-snug text-light-text dark:text-dark-text" style={{ fontFamily: displayFont, textWrap: 'balance' }}>{statement}</h2>
            <a href="#schedule" className="mt-6 inline-block font-semibold underline underline-offset-8 text-primary-readable dark:text-primary-dark-readable">
              <EditText path="components.hero.cta">{buttonLabel}</EditText>
            </a>
          </div>
        </motion.div>
      </section>
    );
  }
  // 'card' (serene, earthy): a soft tinted card resting on the page.
  if (look === 'card') {
    return (
      <section aria-label={buttonLabel} className="bg-light-bg dark:bg-dark-bg transition-colors duration-300 px-4 py-10">
        <motion.div className="container mx-auto rounded-[2.5rem] bg-primary/10 dark:bg-primary-dark/15 px-6 py-12 md:py-16 text-center" {...enter}>
          <h2 {...ed(statementPath)} className="text-3xl md:text-4xl leading-tight text-light-text dark:text-dark-text" style={{ fontFamily: displayFont, textWrap: 'balance' }}>{statement}</h2>
          <a href="#schedule" className={`mt-7 ${solid}`}>
            <Calendar className="h-5 w-5" aria-hidden="true" />
            <EditText path="components.hero.cta">{buttonLabel}</EditText>
          </a>
        </motion.div>
      </section>
    );
  }
  // 'ticket' (festive): a tilted ticket with a dashed edge and two punched holes.
  if (look === 'ticket') {
    return (
      <section aria-label={buttonLabel} className="bg-light-bg dark:bg-dark-bg transition-colors duration-300 overflow-hidden px-4 py-12">
        <motion.div className="relative max-w-3xl mx-auto -rotate-1 rounded-3xl border-[3px] border-dashed border-primary-readable dark:border-primary-dark-readable bg-light-surface dark:bg-dark-surface px-8 py-10 text-center" {...enter}>
          <span className="absolute top-1/2 -start-4 -mt-4 w-8 h-8 rounded-full bg-light-bg dark:bg-dark-bg" aria-hidden="true" />
          <span className="absolute top-1/2 -end-4 -mt-4 w-8 h-8 rounded-full bg-light-bg dark:bg-dark-bg" aria-hidden="true" />
          <h2 {...ed(statementPath)} className="text-3xl md:text-4xl font-bold leading-tight text-light-text dark:text-dark-text">{statement}</h2>
          <a href="#schedule" className={`mt-6 ${solid}`}>
            <EditText path="components.hero.cta">{buttonLabel}</EditText>
          </a>
        </motion.div>
      </section>
    );
  }
  // 'split' (crisp): a tidy bordered card, the words on one side, the button on the other.
  if (look === 'split') {
    return (
      <section aria-label={buttonLabel} className="bg-light-bg dark:bg-dark-bg transition-colors duration-300 px-4 py-10">
        <motion.div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6 rounded-design-card border border-light-text/15 dark:border-dark-text/15 bg-light-surface dark:bg-dark-surface px-6 py-8 md:px-10 text-center md:text-start" {...enter}>
          <h2 {...ed(statementPath)} className="text-2xl md:text-3xl font-bold leading-snug text-light-text dark:text-dark-text">{statement}</h2>
          <a href="#schedule" className={`shrink-0 ${solid} rounded-design-card`}>
            <Calendar className="h-5 w-5" aria-hidden="true" />
            <EditText path="components.hero.cta">{buttonLabel}</EditText>
          </a>
        </motion.div>
      </section>
    );
  }

  return (
    <section
      aria-label={buttonLabel}
      className="bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark transition-colors duration-300"
    >
      <motion.div
        className="container mx-auto px-4 py-14 md:py-16 flex flex-col md:flex-row items-center justify-between gap-8"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="text-center md:text-start">
          <h2 {...ed(statementPath)} className="text-3xl md:text-4xl font-bold leading-tight">
            {statement}
          </h2>
          {chips && chips.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center md:justify-start gap-2">
              {chips.slice(0, 6).map((c) => (
                <a key={c} href="#schedule" className="px-4 py-1.5 rounded-full border border-current/50 text-sm font-semibold hover:bg-light-bg/15 transition-colors">{c}</a>
              ))}
            </div>
          )}
        </div>
        <a
          href="#schedule"
          className="shrink-0 inline-flex items-center justify-center text-center gap-3 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text font-bold px-8 py-4 rounded-design min-h-[3.25rem] hover:opacity-90 transition-opacity"
        >
          <Calendar className="h-5 w-5" aria-hidden="true" />
          <EditText path="components.hero.cta">{buttonLabel}</EditText>
        </a>
      </motion.div>
    </section>
  );
};

export default BookingBand;

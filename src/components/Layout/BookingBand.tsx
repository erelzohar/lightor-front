import React from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface BookingBandProps {
  /** The schedule section's description doubles as the band's statement. */
  statement: string;
}

/**
 * LT-115: the canvas full-bleed CTA band — every artboard breaks the page
 * rhythm with one saturated primary strip ("מחר בבוקר פנוי." / "Booking opens
 * monthly."); generated pages had no color break at all. Sits directly above
 * the schedule section and anchors to it.
 */
const BookingBand: React.FC<BookingBandProps> = ({ statement }) => {
  const { t } = useLanguage();
  return (
    <section
      aria-label={t('hero.book')}
      className="bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark transition-colors duration-300"
    >
      <motion.div
        className="container mx-auto px-4 py-14 md:py-16 flex flex-col md:flex-row items-center justify-between gap-8"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl md:text-4xl font-bold leading-tight text-center md:text-start">
          {statement}
        </h2>
        <a
          href="#schedule"
          className="shrink-0 inline-flex items-center gap-3 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text font-bold px-8 py-4 rounded-design min-h-[3.25rem] hover:opacity-90 transition-opacity"
        >
          <Calendar className="h-5 w-5" aria-hidden="true" />
          {t('hero.book')}
        </a>
      </motion.div>
    </section>
  );
};

export default BookingBand;

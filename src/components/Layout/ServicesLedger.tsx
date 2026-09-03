import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { AppointmentType } from '../../models/AppointmentType';
import type { SectionTone } from '../SectionDivider';
import type { SectionHeader } from '../../models/DesignConfig';
import SectionHeading from './SectionHeading';

interface ServicesLedgerProps {
  appointmentTypes: AppointmentType[];
  /** Section background tone — assigned by App's flow builder. */
  tone: SectionTone;
  header?: SectionHeader;
}

const TONE_BG: Record<SectionTone, string> = {
  bg: 'bg-light-bg dark:bg-dark-bg',
  surface: 'bg-light-surface dark:bg-dark-surface',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { y: 12, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

// LT-109: the canvas price ledger — numbered rows with dotted leaders,
// display type, built from the business's REAL services. Rendered only when
// the servicesLayout token asks for it and priced services exist.
const ServicesLedger: React.FC<ServicesLedgerProps> = ({ appointmentTypes, tone, header }) => {
  const { t, language } = useLanguage();
  const rows = appointmentTypes.filter((a) => a?.name);
  if (!rows.length) return null;

  // Prices arrive as free strings ('70', '100 ₪', '80 ש"ח'); prefix the
  // shekel sign only when the string is purely numeric.
  const formatPrice = (price?: string) => {
    if (!price?.trim()) return '';
    return /^\d+(\.\d+)?$/.test(price.trim()) ? `₪${price.trim()}` : price.trim();
  };

  return (
    <section
      id="services"
      className={`section-y ${TONE_BG[tone]} transition-colors duration-300`}
    >
      <motion.div
        className="container mx-auto px-4 max-w-3xl"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <SectionHeading
            title={t('services.ledger_title', { defaultValue: language === 'he' ? 'המחירון' : 'Services' })}
            variant={header}
            mb="mb-14"
          />
        </motion.div>

        <div role="list">
          {rows.map((item, i) => (
            <motion.div
              key={item._id ?? i}
              role="listitem"
              className={`flex items-baseline gap-4 py-5 ${i < rows.length - 1 ? 'border-b border-light-text/15 dark:border-dark-text/15' : ''}`}
              variants={itemVariants}
            >
              <span className="text-sm font-bold tracking-widest text-primary-readable dark:text-primary-dark-readable w-8 shrink-0" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="text-xl md:text-2xl text-light-text dark:text-dark-text">{item.name}</h3>
              <span className="flex-1 border-b border-dotted border-light-text/30 dark:border-dark-text/30 -translate-y-1.5" aria-hidden="true"></span>
              <span
                className="text-xl md:text-2xl text-light-text dark:text-dark-text"
                style={{ fontFamily: language === 'he' || language === 'ar' ? 'var(--font-heading-rtl)' : 'var(--font-heading)' }}
              >
                {formatPrice(item.price)}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default ServicesLedger;

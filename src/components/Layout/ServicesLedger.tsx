import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { AppointmentType } from '../../models/AppointmentType';
import type { SectionTone } from '../SectionDivider';
import type { SectionHeader, RevealStyle } from '../../models/DesignConfig';
import { revealVariants } from '../../services/reveal';
import SectionHeading from './SectionHeading';
import type { HeadingScale } from '../../services/artDirection';
import ImagesService from '../../services/ImagesService';
import { useEditAttrs, servicePath } from '../../services/editMode';
import { handleSquareImageError } from '../../utils/imageFallback';
import { servicesHeading } from '../../utils/servicesHeading';
import { formatPrice } from '../../utils/currency';

interface ServicesLedgerProps {
  appointmentTypes: AppointmentType[];
  /** Section background tone — assigned by App's flow builder. */
  tone: SectionTone;
  header?: SectionHeader;
  /** LT-131: per-section heading scale (seeded). */
  headerScale?: HeadingScale;
  reveal?: RevealStyle;
  /** LT-220: the owner's heading (`components.services.title`); blank = the default. */
  title?: string;
  /** LT-395: the business's currency; absent reads as shekels. */
  currency?: string;
  /** LT-538: how the style sets the list; 'ledger' is the numbered list with dotted leaders. */
  look?: string;
  /** LT-538: without a calendar on the page, a row with a link leads to the contact form. */
  bookable?: boolean;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const minutes = (ms: string | number | undefined): number | null => {
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 ? Math.round(n / 60000) : null;
};

const TONE_BG: Record<SectionTone, string> = {
  bg: 'bg-light-bg dark:bg-dark-bg',
  surface: 'bg-light-surface dark:bg-dark-surface',
};

const LEGACY_VARIANTS = {
  container: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  },
  item: {
    hidden: { y: 12, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  },
};

// LT-109: the canvas price ledger — numbered rows with dotted leaders,
// display type, built from the business's REAL services. Rendered only when
// the servicesLayout token asks for it and priced services exist.
const ServicesLedger: React.FC<ServicesLedgerProps> = ({ appointmentTypes, tone, header, headerScale, reveal, title, currency, look = 'ledger', bookable = true }) => {
  const ed = useEditAttrs();
  const { t, language } = useLanguage();
  const { container: containerVariants, item } = revealVariants(reveal, LEGACY_VARIANTS);
  const itemVariants = item as Variants;
  const rows = appointmentTypes.filter((a) => a?.name);
  if (!rows.length) return null;
  const displayFont = language === 'he' || language === 'ar' ? 'var(--font-heading-rtl)' : 'var(--font-heading)';
  const name = (service: AppointmentType, cls: string) => <h3 {...ed(servicePath(service._id, 'name'))} className={cls}>{service.name}</h3>;
  const price = (item: AppointmentType, cls: string) => (
    <span {...ed(servicePath(item._id, 'price'))} className={cls} style={{ fontFamily: displayFont }}>{formatPrice(item.price, currency)}</span>
  );
  const duration = (item: AppointmentType, cls: string) => {
    const mins = minutes(item.durationMS);
    return mins ? <span className={cls}>{mins} {t('time.minutes', { defaultValue: language === 'he' ? "דק'" : 'min' })}</span> : null;
  };
  const rowsKey = (item: AppointmentType, i: number) => item._id ?? i;

  // LT-538: a price list per style, on the same services. Names wrap, nothing is cut.
  const list = () => {
    // 'menu' (atelier): two quiet columns, the price a small line under the name.
    if (look === 'menu') {
      return (
        <div className="grid md:grid-cols-2 gap-x-14" role="list">
          {rows.map((item, i) => (
            <motion.div key={rowsKey(item, i)} role="listitem" className="py-6 text-center border-b border-light-text/10 dark:border-dark-text/10" variants={itemVariants}>
              {name(item, 'text-2xl leading-snug text-light-text dark:text-dark-text')}
              {price(item, 'mt-2 block text-sm tracking-widest text-primary-readable dark:text-primary-dark-readable')}
            </motion.div>
          ))}
        </div>
      );
    }
    // 'board' (underground): a scoreboard of heavy rows between thick rules.
    if (look === 'board') {
      return (
        <div className="border-t-2 border-light-text dark:border-dark-text" role="list">
          {rows.map((item, i) => (
            <motion.div key={rowsKey(item, i)} role="listitem" className="flex items-center justify-between gap-6 py-5 md:py-7 border-b-2 border-light-text dark:border-dark-text" variants={itemVariants}>
              {name(item, 'min-w-0 text-3xl md:text-5xl font-bold leading-none text-light-text dark:text-dark-text')}
              {price(item, 'flex-none text-3xl md:text-5xl font-bold leading-none text-primary-readable dark:text-primary-dark-readable')}
            </motion.div>
          ))}
        </div>
      );
    }
    // 'table' (crisp): name, length, price and the way to book, in tidy rows.
    if (look === 'table') {
      return (
        <div className="rounded-design-card overflow-hidden border border-light-text/15 dark:border-dark-text/15" role="list">
          {rows.map((item, i) => (
            <motion.div key={rowsKey(item, i)} role="listitem" className={`flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4 md:px-7 ${i % 2 ? 'bg-light-surface dark:bg-dark-surface' : 'bg-light-bg dark:bg-dark-bg'}`} variants={itemVariants}>
              <div className="flex-1 min-w-[10rem]">
                {name(item, 'text-lg font-semibold text-light-text dark:text-dark-text')}
                {duration(item, 'text-sm text-light-text/70 dark:text-dark-text/70')}
              </div>
              {price(item, 'text-lg font-semibold text-light-text dark:text-dark-text')}
              <a href={bookable ? '#schedule' : '#contact'} className="text-sm font-semibold underline underline-offset-4 text-primary-readable dark:text-primary-dark-readable" aria-label={`${t('hero.book')}: ${item.name}`}>{t('hero.book')}</a>
            </motion.div>
          ))}
        </div>
      );
    }
    // 'tags' (festive): round tags, each with its price in a bubble.
    if (look === 'tags') {
      return (
        <div className="flex flex-wrap justify-center gap-4" role="list">
          {rows.map((item, i) => (
            <motion.div key={rowsKey(item, i)} role="listitem" className="inline-flex items-center gap-4 rounded-[2rem] border-2 border-primary-readable dark:border-primary-dark-readable ps-6 pe-2 py-2 max-w-full" variants={itemVariants}>
              {name(item, 'min-w-0 text-lg font-semibold text-light-text dark:text-dark-text')}
              {price(item, 'flex-none rounded-full bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark px-4 py-2 text-base font-bold')}
            </motion.div>
          ))}
        </div>
      );
    }
    // 'soft' (serene): calm tinted cards, with room around each.
    if (look === 'soft') {
      return (
        <div className="grid md:grid-cols-2 gap-5" role="list">
          {rows.map((item, i) => (
            <motion.div key={rowsKey(item, i)} role="listitem" className="flex items-center justify-between gap-5 rounded-design-card bg-primary/[0.07] dark:bg-primary-dark/10 p-6" variants={itemVariants}>
              <div className="min-w-0">
                {name(item, 'text-xl text-light-text dark:text-dark-text')}
                {duration(item, 'mt-1 block text-sm text-light-text/70 dark:text-dark-text/70')}
              </div>
              {price(item, 'flex-none text-xl text-primary-readable dark:text-primary-dark-readable')}
            </motion.div>
          ))}
        </div>
      );
    }
    // 'arch' (earthy): the price in an arched window, the name under it.
    if (look === 'arch') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-10" role="list">
          {rows.map((item, i) => (
            <motion.div key={rowsKey(item, i)} role="listitem" className="text-center" variants={itemVariants}>
              <div className="relative mx-auto w-full max-w-[11rem] aspect-[4/5] rounded-t-full overflow-hidden bg-primary/10 dark:bg-primary-dark/15 grid place-items-center">
                {item.image && (
                  <img {...ed(servicePath(item._id, 'image'), 'image')} src={ImagesService.getInstance().getImage(item.image)} alt="" loading="lazy" onError={handleSquareImageError} className="absolute inset-0 w-full h-full object-cover" />
                )}
                {!item.image && price(item, 'text-2xl text-primary-readable dark:text-primary-dark-readable')}
              </div>
              {name(item, 'mt-4 text-xl leading-snug text-light-text dark:text-dark-text')}
              {item.image && price(item, 'mt-1 block text-primary-readable dark:text-primary-dark-readable')}
            </motion.div>
          ))}
        </div>
      );
    }
    // 'index' (gallery): an exhibition's index, large light names and small figures.
    if (look === 'index') {
      return (
        <div role="list">
          {rows.map((item, i) => (
            <motion.div key={rowsKey(item, i)} role="listitem" className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-4 py-4" variants={itemVariants}>
              <span className="text-xs text-light-text/70 dark:text-dark-text/70" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              {name(item, 'min-w-0 text-3xl md:text-4xl font-light leading-tight text-light-text dark:text-dark-text')}
              {price(item, 'text-sm text-light-text/80 dark:text-dark-text/80')}
            </motion.div>
          ))}
        </div>
      );
    }
    // 'ledger' (industrial) and 'roman' (heritage): numbered rows with dotted leaders.
    return (
      <div role="list">
        {rows.map((item, i) => (
          <motion.div
            key={rowsKey(item, i)}
            role="listitem"
            className={`flex items-baseline gap-4 py-5 ${i < rows.length - 1 ? 'border-b border-light-text/15 dark:border-dark-text/15' : ''}`}
            variants={itemVariants}
          >
            <span className="text-sm font-bold tracking-widest text-primary-readable dark:text-primary-dark-readable w-8 shrink-0" aria-hidden="true">
              {look === 'roman' ? (ROMAN[i] ?? i + 1) : String(i + 1).padStart(2, '0')}
            </span>
            {item.image && (
              <img {...ed(servicePath(item._id, 'image'), 'image')}
                src={ImagesService.getInstance().getImage(item.image)}
                alt=""
                loading="lazy"
                onError={handleSquareImageError}
                className="w-10 h-10 rounded-md object-cover shrink-0 self-center"
              />
            )}
            {name(item, 'text-xl md:text-2xl text-light-text dark:text-dark-text')}
            <span className="flex-1 border-b border-dotted border-light-text/30 dark:border-dark-text/30 -translate-y-1.5" aria-hidden="true"></span>
            {price(item, 'text-xl md:text-2xl text-light-text dark:text-dark-text')}
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <section
      id="services"
      className={`section-y ${TONE_BG[tone]} transition-colors duration-300`}
    >
      <motion.div
        className={`container mx-auto px-4 ${look === 'board' || look === 'menu' || look === 'soft' ? 'max-w-5xl' : look === 'tags' || look === 'arch' ? 'max-w-4xl' : 'max-w-3xl'}`}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <SectionHeading titlePath="components.services.title"
            title={servicesHeading(title, rows, t, language)}
            variant={header} scale={headerScale}
            mb="mb-14"
          />
        </motion.div>

        {list()}
      </motion.div>
    </section>
  );
};

export default ServicesLedger;

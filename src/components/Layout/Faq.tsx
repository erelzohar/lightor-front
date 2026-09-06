import React from 'react';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { revealVariants } from '../../services/reveal';
import { FaqConfig } from '../../models/FaqConfig';
import type { FaqStyle, SectionHeader, RevealStyle } from '../../models/DesignConfig';
import SectionHeading from './SectionHeading';
import type { HeadingScale } from '../../services/artDirection';
import type { SectionTone } from '../SectionDivider';

interface FaqProps {
  config: FaqConfig;
  /** Section background tone — assigned by App's flow builder (LT-086). */
  tone: SectionTone;
  /** Skeleton variant (LT-093): 'cards' is the pre-LT-093 rendering. */
  faqStyle?: FaqStyle;
  header?: SectionHeader;
  /** LT-131: per-section heading scale (seeded). */
  headerScale?: HeadingScale;
  /** LT-126: per-site motion profile. */
  reveal?: RevealStyle;
}

const TONE_BG: Record<SectionTone, string> = {
  bg: 'bg-light-bg dark:bg-dark-bg',
  surface: 'bg-light-surface dark:bg-dark-surface',
};

const LEGACY_VARIANTS = {
  container: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  },
  item: {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  },
};

// Native <details>/<summary> accordion in every variant: zero JS state,
// keyboard and screen reader support for free, cannot glitch. The variants
// only change the chrome around it (LT-093).
const Faq: React.FC<FaqProps> = ({ config, tone, faqStyle = 'cards', header, headerScale, reveal }) => {
  const { container: containerVariants, item: itemVariants } = revealVariants(reveal, LEGACY_VARIANTS);
  // LT-126 'split': the title pinned in a side column, questions as ruled lines beside it.
  const isSplit = faqStyle === 'split';
  const isLines = faqStyle === 'lines' || faqStyle === 'numbered' || isSplit;

  const renderDetails = (item: { question: string; answer: string }, i: number) => (
    <details
      className={
        faqStyle === 'pills'
          ? 'group rounded-3xl px-6 py-4 bg-primary/10 dark:bg-primary-dark/10'
          : isLines
            ? 'group py-5'
            : 'card-design group px-6 py-4'
      }
    >
      <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold text-light-text dark:text-dark-text [&::-webkit-details-marker]:hidden">
        <span className="flex items-baseline gap-4">
          {faqStyle === 'numbered' && (
            <span className="text-sm font-bold tracking-widest text-primary-readable dark:text-primary-dark-readable" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
          )}
          <span>{item.question}</span>
        </span>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-primary-readable dark:text-primary-dark-readable transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <p className={`mt-4 text-light-text/80 dark:text-dark-text/80 leading-relaxed ${faqStyle === 'numbered' ? 'ms-9' : ''}`}>
        {item.answer}
      </p>
    </details>
  );

  if (isSplit) {
    return (
      <section id="faq" className={`section-y ${TONE_BG[tone]} transition-colors duration-300`}>
        <motion.div
          className="container mx-auto px-4 grid md:grid-cols-[1fr_2fr] gap-12 items-start"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          <motion.div className="md:sticky md:top-28" variants={itemVariants}>
            <SectionHeading title={config.title} variant={header === 'centered' || !header ? 'side' : header} scale={headerScale} mb="mb-0" />
          </motion.div>
          <motion.div
            className="divide-y divide-light-text/15 dark:divide-dark-text/15 border-t border-b border-light-text/15 dark:border-dark-text/15"
            variants={containerVariants}
          >
            {config.items.map((item, i) => (
              <motion.div key={i} variants={itemVariants}>
                {renderDetails(item, i)}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>
    );
  }

  return (
    <section
      id="faq"
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
          <SectionHeading title={config.title} variant={header} scale={headerScale} mb="mb-16" />
        </motion.div>

        <motion.div
          className={isLines ? 'divide-y divide-light-text/15 dark:divide-dark-text/15 border-t border-b border-light-text/15 dark:border-dark-text/15' : 'space-y-4'}
          variants={containerVariants}
        >
          {config.items.map((item, i) => (
            <motion.div key={i} variants={itemVariants}>
              {renderDetails(item, i)}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Faq;

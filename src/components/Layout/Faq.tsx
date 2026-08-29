import React from 'react';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { FaqConfig } from '../../models/FaqConfig';
import type { SectionTone } from '../SectionDivider';

interface FaqProps {
  config: FaqConfig;
  /** Section background tone — assigned by App's flow builder (LT-086). */
  tone: SectionTone;
}

const TONE_BG: Record<SectionTone, string> = {
  bg: 'bg-light-bg dark:bg-dark-bg',
  surface: 'bg-light-surface dark:bg-dark-surface',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

// Native <details>/<summary> accordion: zero JS state, keyboard and screen
// reader support for free, cannot glitch. Boring on purpose.
const Faq: React.FC<FaqProps> = ({ config, tone }) => (
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
      <motion.div variants={itemVariants} className="text-center mb-16">
        <h2 className="text-4xl font-bold text-light-text dark:text-dark-text mb-6">{config.title}</h2>
        <div className="heading-accent mx-auto mb-8" aria-hidden="true"></div>
      </motion.div>

      <motion.div className="space-y-4" variants={containerVariants}>
        {config.items.map((item, i) => (
          <motion.div key={i} variants={itemVariants}>
            <details className="card-design group px-6 py-4">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold text-light-text dark:text-dark-text [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-primary-readable dark:text-primary-dark-readable transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-4 text-light-text/80 dark:text-dark-text/80 leading-relaxed">
                {item.answer}
              </p>
            </details>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  </section>
);

export default Faq;

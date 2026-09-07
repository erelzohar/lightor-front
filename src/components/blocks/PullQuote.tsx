import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG, displayFontFor } from './blockUtils';

interface Props { text: string; attribution?: string; tone?: SectionTone }

/** LT-136: the owner's own line, giant, with a rule. Not a testimonial. */
const PullQuote: React.FC<Props> = ({ text, attribution, tone = 'bg' }) => {
  const { language } = useLanguage();
  return (
    <section className={`section-y ${TONE_BG[tone]} transition-colors duration-300`}>
      <motion.figure
        className="container mx-auto px-4 max-w-5xl m-0"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <span className="block w-16 h-1 bg-primary dark:bg-primary-dark mb-8" aria-hidden="true"></span>
        <blockquote className="m-0 font-bold leading-tight text-light-text dark:text-dark-text" style={{ fontFamily: displayFontFor(language), fontSize: 'clamp(1.75rem, 4vw, 3.5rem)', textWrap: 'balance' }}>
          {text}
        </blockquote>
        {attribution && <figcaption className="mt-6 text-sm font-semibold text-primary-readable dark:text-primary-dark-readable">— {attribution}</figcaption>}
      </motion.figure>
    </section>
  );
};
export default PullQuote;

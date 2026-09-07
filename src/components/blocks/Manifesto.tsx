import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG, displayFontFor } from './blockUtils';

interface Props { text: string; tone?: SectionTone }

/** LT-136: one display-size line across the page — the most "canvas" block. */
const Manifesto: React.FC<Props> = ({ text, tone = 'bg' }) => {
  const { language } = useLanguage();
  return (
    <section className={`section-y ${TONE_BG[tone]} transition-colors duration-300`}>
      <div className="container mx-auto px-4">
        <motion.p
          className="font-bold leading-none text-light-text dark:text-dark-text m-0"
          style={{ fontFamily: displayFontFor(language), fontSize: 'clamp(2.5rem, 7vw, 6rem)', textWrap: 'balance' }}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {text}
        </motion.p>
      </div>
    </section>
  );
};
export default Manifesto;

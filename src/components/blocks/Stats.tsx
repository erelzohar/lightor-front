import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG, displayFontFor } from './blockUtils';

export interface StatItem { value: string; label: string }
interface Props { items: StatItem[]; tone?: SectionTone }

/** LT-136: two to four big numbers. The server only emits numbers the owner wrote. */
const Stats: React.FC<Props> = ({ items, tone = 'surface' }) => {
  const { language } = useLanguage();
  const rows = items.filter((i) => i?.value && i?.label).slice(0, 4);
  if (rows.length < 2) return null;
  return (
    <section className={`section-y ${TONE_BG[tone]} transition-colors duration-300`} aria-label={rows.map((r) => `${r.value} ${r.label}`).join(', ')}>
      <div className={`container mx-auto px-4 grid gap-10 md:gap-6 ${rows.length === 2 ? 'md:grid-cols-2' : rows.length === 3 ? 'md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
        {rows.map((r, i) => (
          <motion.div
            key={i}
            className={`text-center md:text-start ${i > 0 ? 'md:border-s md:ps-6 border-light-text/15 dark:border-dark-text/15' : ''}`}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="font-bold leading-none text-primary-readable dark:text-primary-dark-readable" style={{ fontFamily: displayFontFor(language), fontSize: 'clamp(3rem, 7vw, 5.5rem)', fontVariantNumeric: 'tabular-nums' }}>
              {r.value}
            </div>
            <div className="mt-3 text-light-text/80 dark:text-dark-text/80 text-lg">{r.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
export default Stats;

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG, displayFontFor } from './blockUtils';

export interface ProcessStep { title: string; text?: string }
interface Props { steps: ProcessStep[]; title?: string; tone?: SectionTone; variant?: string }

/** LT-136: how a visit goes, three to five steps — the one honest use of numbering. */
const Process: React.FC<Props> = ({ steps, title, tone = 'surface', variant = 'rail' }) => {
  const { language } = useLanguage();
  const rows = steps.filter((s) => s?.title).slice(0, 5);
  if (rows.length < 2) return null;
  const grid = variant === 'grid';
  return (
    <section className={`section-y ${TONE_BG[tone]} transition-colors duration-300`} aria-label={title || undefined}>
      <div className="container mx-auto px-4">
        {title && <h2 className="text-4xl font-bold text-light-text dark:text-dark-text mb-12">{title}</h2>}
        <ol className={`list-none p-0 m-0 ${grid ? 'grid md:grid-cols-3 gap-8' : 'relative border-s-2 border-primary/30 dark:border-primary-dark/30 ms-5 space-y-10'}`}>
          {rows.map((s, i) => (
            <motion.li
              key={i}
              className={grid ? '' : 'relative ps-10'}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <span
                className={grid
                  ? 'block font-bold leading-none text-primary-readable dark:text-primary-dark-readable mb-4'
                  : 'absolute -start-[1.3rem] top-0 w-10 h-10 rounded-full bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark flex items-center justify-center font-bold'}
                style={grid ? { fontFamily: displayFontFor(language), fontSize: '3rem' } : undefined}
                aria-hidden="true"
              >
                {grid ? String(i + 1).padStart(2, '0') : i + 1}
              </span>
              <h3 className="text-xl font-semibold mb-2 text-light-text dark:text-dark-text">{s.title}</h3>
              {s.text && <p className="m-0 text-light-text/80 dark:text-dark-text/80">{s.text}</p>}
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
};
export default Process;

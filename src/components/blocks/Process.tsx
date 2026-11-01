import React from 'react';
import { useEdit, useEditAttrs } from '../../services/editMode';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG, displayFontFor } from './blockUtils';

export interface ProcessStep { title: string; text?: string }
interface Props { steps: ProcessStep[]; title?: string; tone?: SectionTone; variant?: string; /** LT-243: `blocks.<id>.props`. */ basePath?: string }

/** LT-136: how a visit goes, three to five steps — the one honest use of numbering. */
const STEP_COLUMNS: Record<number, string> = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5' };

const Process: React.FC<Props> = ({ steps, title, tone = 'surface', variant = 'rail', basePath }) => {
  const { language, t } = useLanguage();
  const { editing } = useEdit();
  const ed = useEditAttrs();
  // Each step keeps its index in the stored list, for the editor's paths. In
  // the editor an unwritten step stays on the page, to be clicked and written.
  const rows = steps.map((s, at) => ({ ...s, at })).filter((s) => editing || s?.title).slice(0, 5);
  if (rows.length < (editing ? 1 : 2)) return null;
  const grid = variant === 'grid';
  const stepTitle = (text: string) => text || t('editor.stepTitle');

  // LT-530: numbered circles on one line (21st.dev "How It Works Steps").
  if (variant === 'steps') {
    return (
      <section className={`section-y ${TONE_BG[tone]} transition-colors duration-300`} aria-label={title || undefined}>
        <div className="container mx-auto px-4 max-w-5xl">
          {title && <h2 {...ed(basePath && `${basePath}.title`)} className="text-4xl font-bold text-center text-light-text dark:text-dark-text mb-14" style={{ fontFamily: displayFontFor(language) }}>{title}</h2>}
          <div className="relative">
            <div className="absolute inset-x-0 top-7 hidden md:block h-px bg-primary/30 dark:bg-primary-dark/30" aria-hidden="true" />
            <ol className={`relative list-none p-0 m-0 grid grid-cols-1 gap-10 ${STEP_COLUMNS[rows.length] ?? ''}`}>
              {rows.map((s, i) => (
                <motion.li
                  key={i}
                  className="flex flex-col items-center text-center gap-4"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <span className={`relative z-10 flex items-center justify-center w-14 h-14 rounded-full border-2 border-primary dark:border-primary-dark font-bold tabular-nums text-primary-readable dark:text-primary-dark-readable ${TONE_BG[tone]}`} aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 {...ed(basePath && `${basePath}.steps.${s.at}.title`)} className="text-xl font-semibold text-light-text dark:text-dark-text">{stepTitle(s.title)}</h3>
                  {s.text && <p {...ed(basePath && `${basePath}.steps.${s.at}.text`)} className="m-0 text-light-text/80 dark:text-dark-text/80">{s.text}</p>}
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`section-y ${TONE_BG[tone]} transition-colors duration-300`} aria-label={title || undefined}>
      <div className="container mx-auto px-4">
        {title && <h2 {...ed(basePath && `${basePath}.title`)} className="text-4xl font-bold text-light-text dark:text-dark-text mb-12">{title}</h2>}
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
              <h3 {...ed(basePath && `${basePath}.steps.${s.at}.title`)} className="text-xl font-semibold mb-2 text-light-text dark:text-dark-text">{stepTitle(s.title)}</h3>
              {s.text && <p {...ed(basePath && `${basePath}.steps.${s.at}.text`)} className="m-0 text-light-text/80 dark:text-dark-text/80">{s.text}</p>}
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
};
export default Process;

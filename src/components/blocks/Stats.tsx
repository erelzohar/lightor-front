import React, { useEffect, useRef, useState } from 'react';
import { useEdit, useEditAttrs } from '../../services/editMode';
import { animate, motion, useInView, useReducedMotion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG, displayFontFor } from './blockUtils';

export interface StatItem { value: string; label: string }
interface Props { items: StatItem[]; tone?: SectionTone; /** LT-243: `blocks.<id>.props`. */ basePath?: string }

const NUMBER = /^(\D*?)(\d[\d,]*)(\D*)$/;

/** A whole number counts up once when it comes into view; anything else ("24/7", "4.9") stands as written. */
const CountUp: React.FC<{ value: string }> = ({ value }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const parts = NUMBER.exec(value);
  const target = parts ? Number(parts[2].replace(/,/g, '')) : 0;
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (!parts || reduced || !inView || !target) return;
    const controls = animate(0, target, { duration: 1.2, ease: 'easeOut', onUpdate: (n) => setShown(Math.round(n)), onComplete: () => setShown(null) });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, target, reduced]);

  return <span ref={ref}>{parts && shown !== null ? `${parts[1]}${shown.toLocaleString('en-US')}${parts[3]}` : value}</span>;
};

/**
 * LT-136: two to four big numbers. The server only emits numbers the owner
 * wrote. LT-530: a ruled band whose numbers count up (21st.dev "Stats Band").
 * LT-529: in the editor the unwritten ones stay, to be clicked and written;
 * a section added empty used to draw nothing at all.
 */
const Stats: React.FC<Props> = ({ items, tone = 'surface', basePath }) => {
  const { language, t } = useLanguage();
  const { editing } = useEdit();
  const ed = useEditAttrs();
  // Each row keeps its index in the stored list, for the editor's paths.
  const rows = items.map((r, at) => ({ ...r, at })).filter((i) => editing || (i?.value && i?.label)).slice(0, 4);
  if (rows.length < (editing ? 1 : 2)) return null;
  const columns = rows.length === 2 ? 'md:grid-cols-2' : rows.length === 3 ? 'md:grid-cols-3' : rows.length === 4 ? 'md:grid-cols-4' : '';
  return (
    <section className={`section-y ${TONE_BG[tone]} transition-colors duration-300`} aria-label={rows.map((r) => `${r.value} ${r.label}`).join(', ')}>
      <div className="container mx-auto px-4">
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${columns} gap-px overflow-hidden rounded-design border border-light-text/15 dark:border-dark-text/15 bg-light-text/15 dark:bg-dark-text/15`}>
          {rows.map((r, i) => (
            <motion.div
              key={i}
              className={`p-8 text-center md:text-start ${TONE_BG[tone]}`}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="font-bold leading-none text-primary-readable dark:text-primary-dark-readable tabular-nums" style={{ fontFamily: displayFontFor(language), fontSize: 'clamp(2.75rem, 6vw, 4.5rem)' }}>
                <span {...ed(basePath && `${basePath}.items.${r.at}.value`)} dir="ltr" className={`inline-block ${r.value ? '' : 'opacity-40'}`}>
                  {editing ? r.value || '00' : <CountUp value={r.value} />}
                </span>
              </div>
              <div {...ed(basePath && `${basePath}.items.${r.at}.label`)} className={`mt-3 text-light-text/80 dark:text-dark-text/80 ${r.label ? '' : 'opacity-60'}`}>
                {r.label || t('editor.statLabel')}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
export default Stats;

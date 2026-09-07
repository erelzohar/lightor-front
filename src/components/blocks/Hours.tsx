import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG } from './blockUtils';

interface Props { workingDays: (string | null)[]; tone?: SectionTone; variant?: string }

/** LT-136: opening hours as a block of their own — a table or a one-line strip. */
const Hours: React.FC<Props> = ({ workingDays, tone = 'surface', variant = 'table' }) => {
  const { t, language } = useLanguage();
  const rows = (workingDays ?? []).map((h, i) => ({
    day: t(`day.${i}`),
    hours: h === null || !h ? t('time.closed') : h.split(',').map((r) => r.trim()).filter(Boolean).join(', '),
    open: !!h,
  }));
  if (!rows.some((r) => r.open)) return null;
  const title = t('about.hours', { defaultValue: language === 'he' ? 'שעות פעילות' : 'Hours' });
  if (variant === 'strip') {
    return (
      <section className={`py-8 ${TONE_BG[tone]} border-y border-light-text/15 dark:border-dark-text/15 transition-colors duration-300`} aria-label={title}>
        <div className="container mx-auto px-4 flex flex-wrap items-baseline gap-x-8 gap-y-3 text-sm">
          <span className="font-bold uppercase tracking-widest text-primary-readable dark:text-primary-dark-readable">{title}</span>
          {rows.filter((r) => r.open).map((r, i) => (
            <span key={i} className="text-light-text/80 dark:text-dark-text/80"><b className="font-semibold text-light-text dark:text-dark-text">{r.day}</b> <span dir="ltr">{r.hours}</span></span>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className={`section-y ${TONE_BG[tone]} transition-colors duration-300`} aria-label={title}>
      <div className="container mx-auto px-4 max-w-2xl">
        <h2 className="text-4xl font-bold text-light-text dark:text-dark-text mb-10">{title}</h2>
        <dl className="m-0 divide-y divide-light-text/15 dark:divide-dark-text/15 border-y border-light-text/15 dark:border-dark-text/15">
          {rows.map((r, i) => (
            <div key={i} className="flex justify-between gap-6 py-4">
              <dt className="font-semibold text-light-text dark:text-dark-text">{r.day}</dt>
              <dd className={`m-0 ${r.open ? 'text-light-text/80 dark:text-dark-text/80' : 'text-light-text/40 dark:text-dark-text/40'}`} dir={r.open ? 'ltr' : undefined} style={{ fontVariantNumeric: 'tabular-nums' }}>{r.hours}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};
export default Hours;

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useStill } from '../../hooks/useA11yPrefs';
import { Pin } from 'lucide-react';
import { useEditAttrs } from '../../services/editMode';
import { useLanguage } from '../../contexts/LanguageContext';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG, displayFontFor } from './blockUtils';

interface Row { title: string; text?: string; at: number }
interface Props { rows: Row[]; title?: string; tone?: SectionTone; basePath?: string; stepTitle: (text: string) => string }

/** How strongly each note is tinted in the site's colour, in turn. */
const TINT = ['bg-primary/10 border-primary/20 dark:bg-primary-dark/10 dark:border-primary-dark/25', 'bg-primary/[0.06] border-primary/15 dark:bg-primary-dark/[0.07] dark:border-primary-dark/20', 'bg-primary/[0.14] border-primary/25 dark:bg-primary-dark/[0.13] dark:border-primary-dark/30'];
/** The numbers in a hand that has every digit; the words stay in the site's fonts. */
const HAND = '"Comic Sans MS", "Chalkboard SE", "Marker Felt", "Segoe Print", cursive';

/** The dashed line from each note's middle to the next one's: S-curves, hidden under the notes at both ends. */
export const notesPath = (centres: { x: number; y: number }[]): string => {
  if (centres.length < 2) return '';
  let d = `M${centres[0].x.toFixed(1)} ${centres[0].y.toFixed(1)}`;
  for (let i = 1; i < centres.length; i++) {
    const a = centres[i - 1];
    const b = centres[i];
    const k = (b.x - a.x) * 0.55;
    d += ` C${(a.x + k).toFixed(1)} ${a.y.toFixed(1)} ${(b.x - k).toFixed(1)} ${b.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return d;
};

/**
 * LT-583: 'pinned', the steps as notes pinned to ruled paper (Erel's 21st.dev
 * "How it works"), left and right in turn, each a little tilted, a dashed line
 * running from one to the next behind them. Rebuilt in the page's flow (the
 * reference placed them at fixed heights, where a longer text ran into the next
 * note): the line is measured from where the notes stand, and only on a wide
 * screen. Still: the notes come in once and the line draws itself once, nothing
 * moves after that (the reference's dashes marched forever).
 */
const ProcessNotes: React.FC<Props> = ({ rows, title, tone = 'surface', basePath, stepTitle }) => {
  const { language } = useLanguage();
  const ed = useEditAttrs();
  const boxRef = useRef<HTMLOListElement>(null);
  const notes = useRef<(HTMLLIElement | null)[]>([]);
  const [line, setLine] = useState<{ d: string; w: number; h: number }>({ d: '', w: 0, h: 0 });
  const still = useStill();
  // The line draws itself when the notes come into view (a path inside a mask has no box to watch).
  const seen = useInView(boxRef, { once: true, margin: '0px 0px -15% 0px' });
  const maskId = `lt-notes-${basePath ?? 'line'}`.replace(/[^\w-]/g, '-');

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const centres = notes.current.slice(0, rows.length).filter((n): n is HTMLLIElement => !!n)
        .map((n) => ({ x: n.offsetLeft + n.offsetWidth / 2, y: n.offsetTop + n.offsetHeight * 0.42 }));
      setLine({ d: notesPath(centres), w: box.offsetWidth, h: box.offsetHeight });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [rows.length]);

  return (
    <section className={`section-y relative overflow-hidden ${TONE_BG[tone]} transition-colors duration-300`} aria-label={title || undefined}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [--rule:rgb(var(--color-light-text)_/_.09)] dark:[--rule:rgb(var(--color-dark-text)_/_.12)]"
        style={{
          backgroundImage: 'linear-gradient(var(--rule) 1px, transparent 1px)',
          backgroundSize: '100% 32px',
          backgroundPosition: '0 4px',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent)',
          maskImage: 'linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent)',
        }}
      />
      <div className="container relative mx-auto px-4 max-w-5xl">
        {title && <h2 {...ed(basePath && `${basePath}.title`)} className="text-4xl font-bold text-center text-light-text dark:text-dark-text mb-14" style={{ fontFamily: displayFontFor(language) }}>{title}</h2>}
        <ol ref={boxRef} className="relative m-0 flex list-none flex-col gap-8 p-0 md:gap-0">
          {line.d && (
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 hidden h-full w-full text-light-text/30 dark:text-dark-text/30 md:block" viewBox={`0 0 ${line.w} ${line.h}`} preserveAspectRatio="none">
              {!still && (
                <defs>
                  <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={line.w} height={line.h}>
                    <motion.path d={line.d} fill="none" stroke="#fff" strokeWidth="6" initial={{ pathLength: 0 }} animate={{ pathLength: seen ? 1 : 0 }} transition={{ duration: 1.8, ease: 'easeInOut' }} />
                  </mask>
                </defs>
              )}
              <path d={line.d} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="8 6" strokeLinecap="round" mask={still ? undefined : `url(#${maskId})`} />
            </svg>
          )}
          {rows.map((s, i) => {
            const left = i % 2 === 0;
            return (
              <motion.li
                key={i}
                ref={(el) => { notes.current[i] = el; }}
                className={`relative z-10 mx-auto w-full max-w-sm md:mx-0 md:w-[280px] ${left ? 'md:self-start md:ms-[12%]' : 'md:self-end md:me-[12%]'} ${i > 0 ? 'md:-mt-12' : ''}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className={`transition-transform duration-300 hover:scale-105 ${left ? 'rotate-[3deg] md:rotate-[6deg] rtl:-rotate-[3deg] md:rtl:-rotate-[6deg]' : '-rotate-[3deg] md:-rotate-[6deg] rtl:rotate-[3deg] md:rtl:rotate-[6deg]'}`}>
                  <div className="rounded-[25px] border border-light-text/10 bg-light-bg p-2 shadow-[0_10px_20px_0_rgba(0,0,0,0.12)] dark:border-dark-text/10 dark:bg-dark-bg dark:shadow-none">
                    <Pin className="mx-auto mb-6 h-8 w-8 text-primary-readable dark:text-primary-dark-readable" fill="currentColor" aria-hidden="true" />
                    <div className={`flex flex-col rounded-[15px] border p-[15px] ${TINT[i % TINT.length]}`}>
                      <span className="mb-5 text-4xl text-primary-readable dark:text-primary-dark-readable" style={{ fontFamily: HAND }} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                      <h3 {...ed(basePath && `${basePath}.steps.${s.at}.title`)} className="mb-[10px] text-2xl font-semibold leading-tight text-light-text dark:text-dark-text">{stepTitle(s.title)}</h3>
                      {s.text && <p {...ed(basePath && `${basePath}.steps.${s.at}.text`)} className="m-0 text-sm leading-5 text-light-text/75 dark:text-dark-text/75">{s.text}</p>}
                    </div>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};

export default ProcessNotes;

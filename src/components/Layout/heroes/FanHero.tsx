import React, { type ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';
import EditText from '../../EditText';
import ImagesService from '../../../services/ImagesService';
import { useEdit, useEditAttrs } from '../../../services/editMode';
import { handleWideImageError } from '../../../utils/imageFallback';
import type { HeroConfig } from '../../../models/HeroConfig';
import { HERO_IMAGE, lowEnd } from './common';
import type { HeroStat } from './AeroHero';
import { splitHighlight, type FanPicture } from './fan';

// Where each card stands, by how many there are, left to right (the box is
// drawn left to right whatever the page's direction: a fan is symmetric).
// The middle card is the taller one, the side ones lean out and tuck under it.
interface Card { width: string; edge: string; tilt: number; from: number; lift?: boolean }
const FANS: Record<1 | 2 | 3, Card[]> = {
  3: [
    { width: 'w-[36%]', edge: '-me-[10%] translate-y-[6%]', tilt: -6, from: -1 },
    { width: 'w-[42%]', edge: '', tilt: 0, from: 0, lift: true },
    { width: 'w-[36%]', edge: '-ms-[10%] translate-y-[6%]', tilt: 6, from: 1 },
  ],
  2: [
    { width: 'w-[44%]', edge: '-me-[8%]', tilt: -4, from: -1 },
    { width: 'w-[44%]', edge: '', tilt: 4, from: 1, lift: true },
  ],
  1: [{ width: 'w-[52%]', edge: '', tilt: 0, from: 0, lift: true }],
};

interface FanHeroProps {
  config: HeroConfig;
  alt: string;
  /** The hero's own buttons: the site's main button (book, leave details, products) and the contact one. */
  actions: ReactNode;
  social: ReactNode;
  pictures: FanPicture[];
  /** The owner's figures (stats that survived blockCopy): the small line of proof under the buttons. */
  stats: HeroStat[];
  statsPath?: string;
  /** The stamp decor's line: a small pill above the title (its round seal in the corner would sit on a centred title). */
  stamp?: string;
  /** 'compact' on a site whose sections sit in a narrower column: a smaller title and fan. */
  compact: boolean;
  /** The hero picture is a round logo (see-through corners): shown whole, never cropped. */
  cutout: boolean;
  rtl: boolean;
  noTrack: boolean;
  /** No entrance at all: less motion asked, "stop animations", the editor, or animLevel 'none'. */
  still: boolean;
  /** animLevel: 1 full, 0.25 minimal. */
  pace: number;
}

/**
 * LT-667 'fan' (gallery's own, from Erel's Hero10): the words centred, the
 * title on two lines with the second line's ending in the site's colour, the
 * description, the site's own buttons and a small line of the owner's own
 * figures; under them three of the site's pictures fanned like cards, the
 * side ones leaning out (-6 and +6 degrees) under the taller middle one. On
 * arrival the cards slide in from the sides and the words rise out of a blur,
 * once; still afterwards, so it is a free design (LT-570). Nothing moves when
 * still. The reference's shadcn Button, its CTA helper and wrap-balancer are
 * the site's own buttons and `text-wrap: balance`.
 */
const FanHero: React.FC<FanHeroProps> = ({ config, alt, actions, social, pictures, stats, statsPath, stamp, compact, cutout, rtl, noTrack, still, pace }) => {
  const ed = useEditAttrs();
  const { editing } = useEdit();
  const soft = !lowEnd();
  const [head, tail] = splitHighlight(config.subtitle ?? '');
  const shown = stats.filter((s) => s?.value || s?.label).slice(0, 3);
  // Left to right on the screen, the first in reading order on the reading side (the right on a
  // right-to-left page): three put the hero's in the middle, two put it first.
  const placed = pictures.length === 3 ? (rtl ? [pictures[2], pictures[0], pictures[1]] : [pictures[1], pictures[0], pictures[2]])
    : pictures.length === 2 ? (rtl ? [pictures[1], pictures[0]] : [pictures[0], pictures[1]])
    : pictures;
  // The hero's picture is the card in front; with none, the fan's own (the middle one, or the second of two).
  const hasHero = pictures.some((p) => p.hero);
  const cards = pictures.length ? FANS[pictures.length as 1 | 2 | 3] : [];

  const words: Variants = {
    hidden: { opacity: 0, y: 24, ...(soft ? { filter: 'blur(8px)' } : {}) },
    visible: { opacity: 1, y: 0, ...(soft ? { filter: 'blur(0px)' } : {}), transition: { duration: 0.7 * pace, ease: [0.22, 1, 0.36, 1] }, transitionEnd: soft ? { filter: 'none' } : {} },
  };
  const group: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.12 * pace, delayChildren: 0.1 * pace } } };
  const card = (c: Card): Variants => ({
    hidden: { opacity: 0, x: `${c.from * 60}%`, y: c.from ? '8%' : '14%', rotate: 0 },
    visible: { opacity: 1, x: 0, y: 0, rotate: c.tilt, transition: { duration: 0.9 * pace, delay: (c.from ? 0.45 : 0.3) * pace, ease: [0.22, 1, 0.36, 1] } },
  });

  return (
    <motion.div
      className={`flex flex-col items-center text-center gap-8 ${compact ? 'md:gap-12' : 'md:gap-16'}`}
      initial={still ? false : 'hidden'}
      animate="visible"
      variants={group}
      data-testid="hero-fan"
      data-compact={compact || undefined}
    >
      <motion.div className={`flex w-full flex-col items-center ${compact ? 'max-w-3xl' : 'max-w-4xl'}`} variants={group}>
        {stamp && (
          <motion.p {...ed('components.hero.stamp')} className={`mb-5 rounded-full border border-primary-readable/30 px-4 py-1.5 text-sm font-medium text-primary-readable break-words dark:border-primary-dark-readable/30 dark:text-primary-dark-readable ${noTrack ? '' : 'tracking-wide'}`} variants={words} data-testid="fan-stamp">
            {stamp}
          </motion.p>
        )}
        <motion.h1
          className={`w-full font-bold text-light-text dark:text-dark-text break-words [text-wrap:balance] ${noTrack ? '' : 'tracking-tight'}`}
          style={{ fontSize: compact ? 'clamp(2.125rem, 1.5rem + 2.6vw, 3.75rem)' : 'clamp(2.5rem, 1.6rem + 3.8vw, 5rem)', lineHeight: 1.08 }}
          variants={words}
        >
          <span className="block"><EditText path="components.hero.title">{config.title}</EditText></span>
          {config.subtitle && (
            editing ? (
              // In the editor the line is one text the owner edits: all of it in the colour.
              <span className="block text-primary-readable dark:text-primary-dark-readable"><EditText path="components.hero.subtitle">{config.subtitle}</EditText></span>
            ) : (
              <span className="block">
                {head && <>{head} </>}
                <span className="text-primary-readable dark:text-primary-dark-readable">{tail}</span>
              </span>
            )
          )}
        </motion.h1>
        {config.description && (
          <motion.p className={`mt-4 md:mt-6 max-w-2xl text-light-text/75 dark:text-dark-text/75 [text-wrap:balance] ${compact ? 'text-base md:text-lg' : 'text-lg md:text-xl'}`} variants={words}>
            <EditText path="components.hero.description">{config.description}</EditText>
          </motion.p>
        )}
        <motion.div className="mt-6 md:mt-8 flex flex-wrap justify-center gap-3" variants={words}>{actions}</motion.div>
        {shown.length > 0 ? (
          <motion.ul className="m-0 mt-6 flex list-none flex-wrap justify-center gap-x-5 gap-y-2 p-0 text-sm text-light-text/70 dark:text-dark-text/70" variants={words} data-testid="fan-proof">
            {shown.map((stat, i) => (
              <li key={i} className="flex min-w-0 items-baseline gap-1.5">
                {i > 0 && <span className="text-light-text/30 dark:text-dark-text/30" aria-hidden="true">•</span>}
                <span {...ed(statsPath && `${statsPath}.${i}.value`)} className="font-semibold text-light-text dark:text-dark-text" dir="auto">{stat.value}</span>
                <span {...ed(statsPath && `${statsPath}.${i}.label`)} className="break-words">{stat.label}</span>
              </li>
            ))}
          </motion.ul>
        ) : social && <motion.div className="mt-5 md:mt-6" variants={words}>{social}</motion.div>}
      </motion.div>

      {cards.length > 0 && (
        // Drawn left to right whatever the page's direction (the order above already mirrors it).
        <div dir="ltr" className={`relative flex w-full items-center justify-center ${compact ? 'max-w-[36rem]' : 'max-w-[46rem]'}`} data-pictures={cards.length}>
          {cards.map((c, i) => {
            const p = placed[i];
            const whole = p.hero && cutout;
            const front = hasHero ? !!p.hero : !!c.lift;
            return (
              // The place (overlap, drop) on a plain box: framer's own transform is on the card inside.
              <div key={p.src} className={`relative ${c.width} ${c.edge} ${front ? 'z-10' : 'z-0'} shrink-0`} data-front={front || undefined}>
                <motion.div
                  className="aspect-[4/5] w-full overflow-hidden rounded-design-card bg-light-surface shadow-xl ring-1 ring-black/10 dark:bg-dark-surface dark:ring-white/15"
                  variants={card(c)}
                >
                  <img
                    {...ed(p.path, 'image')}
                    {...(p.hero ? HERO_IMAGE : { loading: 'lazy' })}
                    src={ImagesService.getInstance().getImage(p.src)}
                    alt={p.hero ? alt : ''}
                    onError={handleWideImageError}
                    className={`h-full w-full ${whole ? 'object-contain p-6' : 'object-cover'}`}
                  />
                </motion.div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default FanHero;

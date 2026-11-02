import React, { type ReactNode } from 'react';
import { Award, Heart, Star } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import EditText from '../../EditText';
import ImagesService from '../../../services/ImagesService';
import { useEditAttrs } from '../../../services/editMode';
import { useStill } from '../../../hooks/useA11yPrefs';
import { handleWideImageError } from '../../../utils/imageFallback';
import type { HeroConfig } from '../../../models/HeroConfig';
import { HERO_IMAGE } from './common';
import type { HeroStat } from './AeroHero';

const STAT_ICONS = [Award, Heart, Star];

// Where the framed pictures stand, by how many there are: three at different
// heights (one up top, one to the side, one low), two across, or one with the
// shapes around it. The box is only as tall as its frames (LT-554: one picture
// once stood atop a box kept for three).
const ARRANGEMENTS: Record<1 | 2 | 3, { box: string; frames: string[]; shapes: string[] }> = {
  3: {
    box: 'w-full max-w-xl h-[22rem] sm:h-[31rem] lg:h-[35rem]',
    frames: [
      'inset-x-0 mx-auto top-0 w-44 h-44 sm:w-64 sm:h-64 lg:w-72 lg:h-72',
      'end-0 top-1/3 w-36 h-36 sm:w-56 sm:h-56 lg:w-64 lg:h-64',
      'start-0 bottom-0 w-32 h-32 sm:w-48 sm:h-48 lg:w-56 lg:h-56',
    ],
    shapes: [
      'start-1/4 -top-4 w-16 h-16 rounded-full',
      'end-1/4 bottom-0 w-12 h-12 rounded-lg',
      'start-4 bottom-1/4 w-6 h-6 rounded-full',
    ],
  },
  2: {
    box: 'w-full max-w-xl h-[18rem] sm:h-[25rem] lg:h-[29rem]',
    frames: [
      'start-0 top-0 w-48 h-48 sm:w-72 sm:h-72 lg:w-80 lg:h-80',
      'end-0 bottom-0 w-36 h-36 sm:w-52 sm:h-52 lg:w-60 lg:h-60',
    ],
    shapes: [
      'end-1/4 top-4 w-16 h-16 rounded-full',
      'start-1/4 bottom-0 w-12 h-12 rounded-lg',
      'end-1/3 top-1/3 w-6 h-6 rounded-full',
    ],
  },
  1: {
    box: 'w-60 h-60 sm:w-80 sm:h-80 lg:w-96 lg:h-96',
    frames: ['inset-0'],
    shapes: [
      '-end-4 -top-4 w-16 h-16 rounded-full',
      '-start-5 -bottom-3 w-12 h-12 rounded-lg',
      '-start-8 top-1/2 w-6 h-6 rounded-full',
    ],
  },
};

interface CollageHeroProps {
  config: HeroConfig;
  alt: string;
  actions: ReactNode;
  social: ReactNode;
  /** The gallery's pictures, or on a site with none its products': the collage's other two frames. */
  thumbs: string[];
  /** Where the editor finds those pictures (the gallery's items); none for the products'. */
  thumbsPath?: string;
  stats: HeroStat[];
  /** Where the figures live, for the site editor. */
  statsPath?: string;
  item: Variants;
  container: Variants;
}

/**
 * LT-531: 'collage' (serene's own): the words beside three framed pictures
 * standing at different heights, with a few soft shapes drifting around them.
 * The frames are the hero picture and the gallery's first two (the products'
 * first two on a products site, which has no gallery); the numbers are the
 * owner's own (stats that survived blockCopy), else the social links.
 */
const CollageHero: React.FC<CollageHeroProps> = ({ config, alt, actions, social, thumbs, thumbsPath, stats, statsPath, item, container }) => {
  const ed = useEditAttrs();
  const still = useStill();
  const pictures = [config.heroImageSrc, ...thumbs.filter((src) => src !== config.heroImageSrc)].filter(Boolean).slice(0, 3);
  const { box, frames, shapes } = ARRANGEMENTS[Math.max(1, pictures.length) as 1 | 2 | 3];

  return (
    <motion.div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-12 lg:gap-8" variants={container}>
      <motion.div className="flex flex-col items-center text-center lg:items-start lg:text-start" variants={container}>
        <motion.h1 className="font-bold leading-tight text-light-text dark:text-dark-text" variants={item}>
          <EditText path="components.hero.title">{config.title}</EditText>
          <span className="block text-primary-readable dark:text-primary-dark-readable"><EditText path="components.hero.subtitle">{config.subtitle}</EditText></span>
        </motion.h1>
        <motion.p className="mt-6 max-w-md text-lg md:text-xl text-light-text/80 dark:text-dark-text/80" variants={item}>
          <EditText path="components.hero.description">{config.description}</EditText>
        </motion.p>
        <motion.div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-4" variants={item}>{actions}</motion.div>
        {stats.length > 0 ? (
          <motion.div className="mt-10 flex flex-wrap justify-center lg:justify-start gap-6 md:gap-8" variants={item}>
            {stats.slice(0, 3).map((stat, i) => {
              const Icon = STAT_ICONS[i];
              return (
                <div key={i} className="flex items-center gap-3 text-start">
                  <span className="flex-none w-10 h-10 grid place-items-center rounded-full bg-primary/10 dark:bg-primary-dark/15 text-primary-readable dark:text-primary-dark-readable">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p {...ed(statsPath && `${statsPath}.${i}.value`)} className="text-xl font-bold text-light-text dark:text-dark-text" dir="auto">{stat.value}</p>
                    <p {...ed(statsPath && `${statsPath}.${i}.label`)} className="text-sm text-light-text/80 dark:text-dark-text/80">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : <div className="mt-8">{social}</div>}
      </motion.div>

      {/* On a phone the pictures lead, as in every other hero with an image. */}
      <motion.div className={`relative order-first lg:order-none mx-auto ${box}`} data-pictures={pictures.length} variants={container}>
        {shapes.map((shape, i) => (
          <span key={i} className={`absolute bg-primary/15 dark:bg-primary-dark/20 ${shape} ${still ? '' : 'lt-float'}`} style={{ animationDelay: `${-i * 1.1}s` }} aria-hidden="true" />
        ))}
        {pictures.map((src, i) => (
          // The frame's place is on a plain box: framer's own transform would replace a translate here.
          <div key={i} className={`absolute ${frames[i]}`}>
            <motion.div className="w-full h-full p-2 rounded-design-card bg-light-surface dark:bg-dark-surface shadow-lg" variants={item}>
              <img
                {...(i === 0 ? ed('components.hero.heroImageSrc', 'image') : ed(thumbsPath && `${thumbsPath}.${thumbs.indexOf(src)}.url`, 'image'))}
                {...(i === 0 ? HERO_IMAGE : { loading: 'lazy' })}
                src={ImagesService.getInstance().getImage(src)}
                alt={i === 0 ? alt : ''}
                onError={handleWideImageError}
                className="w-full h-full object-cover rounded-design-card"
              />
            </motion.div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default CollageHero;

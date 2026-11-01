import React, { useCallback, useRef, type ReactNode } from 'react';
import EditText from '../../EditText';
import ImagesService from '../../../services/ImagesService';
import { useEdit, useEditAttrs } from '../../../services/editMode';
import { useStill } from '../../../hooks/useA11yPrefs';
import { handleWideImageError } from '../../../utils/imageFallback';
import type { HeroConfig } from '../../../models/HeroConfig';
import { clamp, HERO_IMAGE, useScrollFrame } from './common';

// How far behind the page each layer sits: 0 scrolls with it, 1 stands still.
const DEPTHS = [0.7, 0.5, 0.38, 0.1];

const FAR_HILL = 'M0 150C180 70 340 60 560 130S980 230 1200 130 1380 70 1440 90V320H0Z';
const NEAR_HILL = 'M0 210C160 150 320 250 560 210S960 90 1180 170 1380 240 1440 200V320H0Z';

interface ParallaxHeroProps {
  config: HeroConfig;
  alt: string;
  /** The site's buttons, drawn by Hero. */
  actions: ReactNode;
  social: ReactNode;
  /** LT-531: the section under the hero, whose colour the near hill melts into. */
  belowTone?: 'bg' | 'surface';
  flip?: boolean;
}

/**
 * LT-531: 'parallax' (earthy's own): the layered scroll of a mountain scene,
 * made for an owner who has one photo and no cut-outs. The photo is the far
 * layer; two hills drawn in the site's own colours are the near ones, and the
 * headline stands between them, so on the way down it sinks behind the near
 * hill as the hero melts into the next section. Transforms only, written once
 * per frame while scrolling; no scroll library, and the page keeps its own scroll.
 */
const ParallaxHero: React.FC<ParallaxHeroProps> = ({ config, alt, actions, social, belowTone = 'bg', flip }) => {
  const ed = useEditAttrs();
  const { editing } = useEdit();
  const still = useStill();
  const root = useRef<HTMLDivElement>(null);
  const layers = useRef<(HTMLElement | SVGSVGElement | null)[]>([]);

  const draw = useCallback(() => {
    const el = root.current;
    if (!el) return;
    const { top, height } = el.getBoundingClientRect();
    const scrolled = clamp(-top, 0, height);
    DEPTHS.forEach((depth, i) => {
      const layer = layers.current[i];
      if (layer) layer.style.transform = `translate3d(0, ${(scrolled * depth).toFixed(1)}px, 0)`;
    });
  }, []);
  useScrollFrame(!still && !editing, draw);

  const hill = (i: number, path: string, className: string) => (
    <svg
      ref={(el) => { layers.current[i] = el; }}
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
      className={`absolute inset-x-0 -bottom-px w-full h-[32%] pointer-events-none will-change-transform ${flip ? '-scale-x-100' : ''} ${className}`}
      aria-hidden="true"
    >
      <path d={path} fill="currentColor" />
    </svg>
  );

  return (
    <div ref={root} className="relative h-screen min-h-[38rem] overflow-hidden">
      <img
        {...ed('components.hero.heroImageSrc', 'image')}
        {...HERO_IMAGE}
        ref={(el) => { layers.current[0] = el; }}
        src={ImagesService.getInstance().getImage(config.heroImageSrc)}
        alt={alt}
        onError={handleWideImageError}
        className="absolute inset-0 w-full h-full object-cover will-change-transform"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/30 to-black/10" aria-hidden="true" />
      {hill(1, FAR_HILL, 'text-primary/40 dark:text-primary-dark/40')}
      <div
        ref={(el) => { layers.current[2] = el; }}
        className="absolute inset-x-0 top-[calc(var(--nav-offset,5.5rem)_+_6vh)] px-4 text-center text-white will-change-transform"
      >
        <h1 className="font-bold leading-tight max-w-4xl mx-auto">
          <EditText path="components.hero.title">{config.title}</EditText>
          {config.subtitle && <span className="block"><EditText path="components.hero.subtitle">{config.subtitle}</EditText></span>}
        </h1>
        {config.description && (
          <p className="mt-5 text-lg md:text-xl text-white/90 max-w-2xl mx-auto"><EditText path="components.hero.description">{config.description}</EditText></p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">{actions}</div>
        <div className="mt-6 flex justify-center [&_button]:bg-white/90">{social}</div>
      </div>
      {hill(3, NEAR_HILL, belowTone === 'surface' ? 'text-light-surface dark:text-dark-surface' : 'text-light-bg dark:text-dark-bg')}
    </div>
  );
};

export default ParallaxHero;

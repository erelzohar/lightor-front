import React, { useCallback, useRef, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import EditText from '../../EditText';
import ImagesService from '../../../services/ImagesService';
import { useEdit, useEditAttrs } from '../../../services/editMode';
import { useStill } from '../../../hooks/useA11yPrefs';
import { handleWideImageError } from '../../../utils/imageFallback';
import type { HeroConfig } from '../../../models/HeroConfig';
import { clamp, HERO_IMAGE, useScrollFrame } from './common';

// The window the picture opens from, and when the words on it come in.
const startSize = (w: number, h: number) => ({ w: Math.min(300, w * 0.64), h: Math.min(400, h * 0.46) });
const WORDS_FROM = 0.72;

interface ExpandHeroProps {
  config: HeroConfig;
  alt: string;
  actions: ReactNode;
  social: ReactNode;
  rtl: boolean;
}

/**
 * LT-531: 'expand' (atelier's own): the picture opens from a small window to the
 * whole screen as the page scrolls, and the two lines of the headline around it
 * part to the sides. The stage is sticky inside a taller box, so the page scrolls
 * as it always does: no wheel or touch is taken from the visitor. The picture
 * never changes size, its clip does, so nothing is laid out while it opens.
 * Held still (or in the editor) it is simply the opened picture with its words.
 */
const ExpandHero: React.FC<ExpandHeroProps> = ({ config, alt, actions, social, rtl }) => {
  const ed = useEditAttrs();
  const { editing } = useEdit();
  const still = useStill();
  const moving = !still && !editing;

  const root = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const first = useRef<HTMLDivElement>(null);
  const second = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const el = root.current;
    if (!el || !image.current) return;
    const { top, height } = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = el.clientWidth;
    const p = clamp(-top / Math.max(1, height - vh), 0, 1);
    const eased = p * p * (3 - 2 * p);
    const start = startSize(vw, vh);
    const x = ((vw - start.w) / 2) * (1 - eased);
    const y = ((vh - start.h) / 2) * (1 - eased);
    image.current.style.clipPath = `inset(${y.toFixed(1)}px ${x.toFixed(1)}px round ${(18 * (1 - eased)).toFixed(1)}px)`;
    const away = eased * vw * 0.9 * (rtl ? -1 : 1);
    if (first.current) {
      first.current.style.transform = `translate3d(${(-away).toFixed(1)}px, 0, 0)`;
      first.current.style.opacity = String(1 - clamp(p * 1.6, 0, 1));
    }
    if (second.current) {
      second.current.style.transform = `translate3d(${away.toFixed(1)}px, 0, 0)`;
      second.current.style.opacity = String(1 - clamp(p * 1.6, 0, 1));
    }
    if (words.current) {
      const shown = clamp((p - WORDS_FROM) / (1 - WORDS_FROM), 0, 1);
      words.current.style.opacity = String(shown);
      words.current.style.transform = `translate3d(0, ${((1 - shown) * 24).toFixed(1)}px, 0)`;
      if (shade.current) shade.current.style.opacity = String(shown);
    }
    if (hint.current) hint.current.style.opacity = String(1 - clamp(p * 5, 0, 1));
  }, [rtl]);
  useScrollFrame(moving, draw);

  return (
    <div ref={root} className="relative" style={{ height: moving ? '200vh' : undefined }}>
      <div className={`${moving ? 'sticky top-0' : 'relative'} h-screen min-h-[32rem] overflow-hidden`}>
        <img
          {...ed('components.hero.heroImageSrc', 'image')}
          {...HERO_IMAGE}
          ref={image}
          src={ImagesService.getInstance().getImage(config.heroImageSrc)}
          alt={alt}
          onError={handleWideImageError}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {moving && (
          <>
            <div ref={first} className="absolute inset-x-0 bottom-[calc(50%_+_min(200px,23vh)_+_1rem)] px-4 text-center pointer-events-none" aria-hidden="true">
              <p className="font-bold leading-none text-light-text dark:text-dark-text" style={{ fontSize: 'clamp(2.25rem, 1.4rem + 4vw, 5rem)' }}>{config.title}</p>
            </div>
            {config.subtitle && (
              <div ref={second} className="absolute inset-x-0 top-[calc(50%_+_min(200px,23vh)_+_1rem)] px-4 text-center pointer-events-none" aria-hidden="true">
                <p className="font-bold leading-none text-primary-readable dark:text-primary-dark-readable" style={{ fontSize: 'clamp(1.75rem, 1.2rem + 3vw, 4rem)' }}>{config.subtitle}</p>
              </div>
            )}
          </>
        )}
        {/* LT-657: the buttons stand under the words, in the same column. They used to
            be pinned to the bottom over a fixed gap in the words' box; on a phone two
            buttons wrap to two rows, taller than the gap, and covered the social links. */}
        <div className="absolute inset-x-0 bottom-0 text-center text-white" data-testid="expand-foot">
          <div ref={shade} className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" style={moving ? { opacity: 0 } : undefined} aria-hidden="true" />
          <div ref={words} className="relative pt-24 px-4" style={moving ? { opacity: 0 } : undefined}>
            <h1 className="font-bold leading-tight max-w-4xl mx-auto">
              <EditText path="components.hero.title">{config.title}</EditText>
              {config.subtitle && <span className="block"><EditText path="components.hero.subtitle">{config.subtitle}</EditText></span>}
            </h1>
            {config.description && <p className="mt-4 text-lg md:text-xl text-white/90 max-w-2xl mx-auto"><EditText path="components.hero.description">{config.description}</EditText></p>}
            <div className="mt-4 flex justify-center [&_button]:bg-white/90">{social}</div>
          </div>
          <div className="relative mt-5 pb-[6vh] px-4 flex flex-wrap items-center justify-center gap-3">{actions}</div>
        </div>
        {moving && (
          <div ref={hint} className="absolute inset-x-0 bottom-1 flex justify-center text-light-text/60 dark:text-dark-text/60 pointer-events-none" aria-hidden="true">
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandHero;

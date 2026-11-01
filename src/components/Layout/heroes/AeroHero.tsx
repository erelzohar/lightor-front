import React, { type ReactNode } from 'react';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import EditText from '../../EditText';
import MarqueeStrip from '../../MarqueeStrip';
import ImagesService from '../../../services/ImagesService';
import { useEditAttrs } from '../../../services/editMode';
import { handleSquareImageError, handleWideImageError } from '../../../utils/imageFallback';
import type { HeroConfig } from '../../../models/HeroConfig';
import type { MainCta } from '../../../services/siteMode';
import { HERO_IMAGE } from './common';

export interface HeroStat { value: string; label: string }

interface AeroHeroProps {
  config: HeroConfig;
  alt: string;
  cta: MainCta | null;
  /** Shown when there is no main button, and beside it otherwise. */
  contact: ReactNode;
  social: ReactNode;
  /** Pictures for the row of small circles: the gallery's. */
  thumbs: string[];
  stat?: HeroStat;
  /** Where the fact lives, for the site editor. */
  statPath?: string;
  services: string[];
  rtl: boolean;
  noTrack: boolean;
}

/**
 * LT-531: 'aero' (crisp's own): half the screen a photo, the other half tight
 * large type, a row of small circles beside a fact, a two-part button and a
 * strip along the foot. The strip carries the business's services where the
 * reference had client logos, and the fact comes from the owner's own words
 * (a stat that survived blockCopy, else the stamp line): never an invented number.
 */
const AeroHero: React.FC<AeroHeroProps> = ({ config, alt, cta, contact, social, thumbs, stat, statPath, services, rtl, noTrack }) => {
  const ed = useEditAttrs();
  const Arrow = rtl ? ArrowUpLeft : ArrowUpRight;
  const circles = thumbs.slice(0, 4);
  const fact = stat?.value ?? '';
  const factLabel = stat?.label ?? config.stamp ?? '';

  return (
    <div className="grid md:grid-cols-2 min-h-screen pt-[var(--nav-offset,5.5rem)]">
      <div className="relative min-h-[36vh] md:min-h-0 mx-3 md:ms-3 md:me-0 mb-3 rounded-design-card overflow-hidden">
        <img
          {...ed('components.hero.heroImageSrc', 'image')}
          {...HERO_IMAGE}
          src={ImagesService.getInstance().getImage(config.heroImageSrc)}
          alt={alt}
          onError={handleWideImageError}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      <div className="flex flex-col min-w-0 px-5 md:px-10 lg:px-14 pt-4 md:pt-10">
        <div className="flex-1 flex flex-col justify-center gap-6 md:gap-7 pb-6">
          <h1 className={`font-bold text-light-text dark:text-dark-text ${noTrack ? '' : 'tracking-tight'}`} style={{ fontSize: 'clamp(2.5rem, 1.5rem + 3.9vw, 5.25rem)', lineHeight: 1.04 }}>
            <EditText path="components.hero.title">{config.title}</EditText>
            {config.subtitle && <span className="block"><EditText path="components.hero.subtitle">{config.subtitle}</EditText></span>}
          </h1>
          {config.description && (
            <p className="text-lg md:text-xl text-light-text/80 dark:text-dark-text/80 max-w-xl"><EditText path="components.hero.description">{config.description}</EditText></p>
          )}
          {(circles.length > 1 || factLabel) && (
            <div className="flex items-center gap-4">
              {circles.length > 1 && (
                <div className="flex flex-none" aria-hidden="true">
                  {circles.map((src, i) => (
                    <img key={i} loading="lazy" src={ImagesService.getInstance().getImage(src)} alt="" onError={handleSquareImageError} className={`w-11 h-11 md:w-12 md:h-12 rounded-full object-cover ring-2 ring-light-bg dark:ring-dark-bg ${i ? '-ms-3' : ''}`} />
                  ))}
                </div>
              )}
              {factLabel && (
                <div className="min-w-0 leading-tight text-light-text dark:text-dark-text">
                  {fact && <div {...ed(statPath && `${statPath}.value`)} className="text-lg md:text-xl font-semibold" dir="auto">{fact}</div>}
                  <div {...ed(stat ? statPath && `${statPath}.label` : 'components.hero.stamp')} className="text-sm md:text-base text-light-text/80 dark:text-dark-text/80">{factLabel}</div>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {cta && (
              <a href={cta.href} className="group inline-flex items-center gap-1" aria-label={cta.label}>
                <span {...ed('components.hero.cta')} className="rounded-full bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark px-7 py-3.5 md:py-4 font-medium text-center transition-opacity group-hover:opacity-90">{cta.label}</span>
                <span className="flex-none w-12 h-12 md:w-14 md:h-14 grid place-items-center rounded-full bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark transition-transform group-hover:scale-105">
                  <Arrow className="w-5 h-5" aria-hidden="true" />
                </span>
              </a>
            )}
            {contact}
          </div>
          {social}
        </div>
        {services.length > 0 && (
          <div className="py-4 border-t border-light-text/10 dark:border-dark-text/10 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
            <MarqueeStrip items={services} className="text-sm md:text-base font-medium text-light-text/70 dark:text-dark-text/70" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AeroHero;

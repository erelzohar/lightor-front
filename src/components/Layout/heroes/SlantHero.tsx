import React, { type ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Mail, MapPin, Phone } from 'lucide-react';
import EditText from '../../EditText';
import ImagesService from '../../../services/ImagesService';
import { useEditAttrs } from '../../../services/editMode';
import { useStill } from '../../../hooks/useA11yPrefs';
import { handleWideImageError } from '../../../utils/imageFallback';
import { displayPhone, telHref } from '../../../utils/phone';
import { googleMapsHref } from '../../../utils/navigation';
import type { HeroConfig } from '../../../models/HeroConfig';
import { HERO_IMAGE } from './common';

interface SlantHeroProps {
  config: HeroConfig;
  alt: string;
  businessName?: string;
  logo?: string;
  /** The hero's own buttons (booking, contact), as every hero has them. */
  actions: ReactNode;
  phone?: string | null;
  email?: string;
  address?: string;
  /** Mirrored by the page's own direction (index.css .lt-slant). */
  rtl?: boolean;
  noTrack: boolean;
}

const container: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } } };
const item: Variants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } } };

/**
 * LT-591 'slant' (electric's own, from Erel's hero): the words on one side
 * (the logo and the name are the navbar's), the title's second line in the
 * site's colour, a short bar, the line and the buttons; at their foot the
 * business's phone, email and address. Beside them the photo (above them on
 * a phone), opening once to a slant. Still afterwards: a one-time entrance.
 */
const SlantHero: React.FC<SlantHeroProps> = ({ config, alt, actions, phone, email, address, noTrack }) => {
  const ed = useEditAttrs();
  const still = useStill();
  const lines = [
    phone ? { key: 'phone', Icon: Phone, text: <span dir="ltr">{displayPhone(phone)}</span>, href: telHref(phone) } : null,
    email ? { key: 'email', Icon: Mail, text: <span dir="ltr" className="break-all">{email}</span>, href: `mailto:${email}` } : null,
    address ? { key: 'address', Icon: MapPin, text: <span className="break-words">{address}</span>, href: googleMapsHref(address), external: true } : null,
  ].filter((l): l is NonNullable<typeof l> => !!l);

  return (
    <motion.div
      className="relative flex min-h-screen w-full flex-col overflow-hidden pt-[var(--nav-offset,5.5rem)] md:flex-row"
      initial={still ? false : 'hidden'}
      animate="visible"
      variants={container}
      data-testid="hero-slant"
    >
      <div className="flex w-full flex-col justify-between px-6 pb-10 pt-8 md:w-1/2 md:px-12 md:pb-12 md:pt-10 lg:w-3/5 lg:px-16">
        <div>
          {/* The reference's logo and name stay in the site's own navbar, above: here only its line. */}
          {config.stamp && (
            <motion.p {...ed('components.hero.stamp')} className={`mb-6 text-sm font-semibold text-light-text/60 break-words dark:text-dark-text/60 ${noTrack ? '' : 'uppercase tracking-wider'}`} variants={item}>{config.stamp}</motion.p>
          )}
          <motion.h1 className={`font-bold leading-tight text-light-text dark:text-dark-text ${noTrack ? '' : 'tracking-tight'}`} style={{ fontSize: 'clamp(2.25rem, 1.4rem + 3vw, 4rem)' }} variants={item}>
            <EditText path="components.hero.title">{config.title}</EditText>
            {config.subtitle && <span className="block text-primary-readable dark:text-primary-dark-readable"><EditText path="components.hero.subtitle">{config.subtitle}</EditText></span>}
          </motion.h1>
          <motion.div aria-hidden="true" className="my-6 h-1 w-20 bg-primary dark:bg-primary-dark" variants={item} />
          {config.description && (
            <motion.p className="mb-8 max-w-md text-base text-light-text/75 dark:text-dark-text/75 md:text-lg" variants={item}>
              <EditText path="components.hero.description">{config.description}</EditText>
            </motion.p>
          )}
          <motion.div className="flex flex-wrap gap-3" variants={item}>{actions}</motion.div>
        </div>
        {lines.length > 0 && (
          <motion.ul className="m-0 mt-12 grid list-none grid-cols-1 gap-4 p-0 text-sm text-light-text/70 dark:text-dark-text/70 sm:grid-cols-3" variants={item}>
            {lines.map(({ key, Icon, text, href, external }) => (
              <li key={key} className="min-w-0">
                <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="flex items-center gap-2 hover:text-primary-readable dark:hover:text-primary-dark-readable transition-colors">
                  <Icon className="h-5 w-5 shrink-0 text-primary-readable dark:text-primary-dark-readable" aria-hidden="true" />
                  {text}
                </a>
              </li>
            ))}
          </motion.ul>
        )}
      </div>
      {/* A phone: the photo first, its foot on a slant; wider: beside the words, its inner edge on a
          slant (index.css .lt-slant: the end state is the style, the opening a one-time animation). */}
      <div className={`lt-slant relative order-first min-h-[42vh] w-full md:order-none md:min-h-0 md:w-1/2 lg:w-2/5 ${still ? 'lt-slant-still' : ''}`}>
        <img
          {...ed('components.hero.heroImageSrc', 'image')}
          {...HERO_IMAGE}
          src={ImagesService.getInstance().getImage(config.heroImageSrc)}
          alt={alt}
          onError={handleWideImageError}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </motion.div>
  );
};

export default SlantHero;

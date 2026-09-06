import React, { useEffect, useRef } from 'react';
import { Calendar, Phone, Instagram, Facebook } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { ContactModal } from '../ContactModal';
import { useContactHandler } from '../../hooks/useContactHandler';
import { HeroConfig } from '../../models/HeroConfig';
import { Social } from '../../models/Social';
import { Palette } from '../../models/WebsiteConfig';
import { DesignConfig, BorderRadius } from '../../models/DesignConfig';
import { AppointmentType } from '../../models/AppointmentType';
import ImagesService from '../../services/ImagesService';
import { handleWideImageError } from '../../utils/imageFallback';
import { useIsDarkMode } from '../../hooks/useIsDarkMode';

function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

function buildVantaOptions(type: string, isDark: boolean, palette: Palette | undefined): Record<string, any> {
  const primary = palette?.colorPrimary ?? '#2563eb';
  const primaryDark = palette?.colorPrimaryDark ?? '#14b8a6';
  const lightBg = palette?.colorLightBg ?? '#ffffff';
  const darkBg = palette?.colorDarkBg ?? '#000000';

  switch (type) {
    case 'clouds':
      return isDark
        ? { skyColor: hexToInt(darkBg), cloudColor: 0x8f99a7, sunColor: 0x8ccaed, sunGlareColor: hexToInt(primaryDark), sunlightColor: 0xcfcf33, speed: 0.5 }
        : { skyColor: 0x4e9ebe, cloudColor: 0xd0d8e0, sunColor: hexToInt(primary), sunGlareColor: primaryDark, speed: 0.5 };

    case 'fog':
      return isDark
        ? { highlightColor: hexToInt(primaryDark), midtoneColor: 0xa7a7, baseColor: 0x0, blurFactor: 0.52, speed: 0.5, zoom: 0.5 }
        : { highlightColor: hexToInt(primary), midtoneColor: hexToInt(primaryDark), blurFactor: 0.52, speed: 0.5, zoom: 0.5 };
    case 'clouds2':
      return isDark
        ? { skyColor: hexToInt(darkBg), cloudColor: hexToInt(primaryDark), lightColor: 0x91aecd, speed: 0.5, texturePath: '/noise.png' }
        : { skyColor: hexToInt(lightBg), cloudColor: hexToInt(primary), speed: 0.5, texturePath: '/noise.png' };

    case 'topology':
      return isDark
        ? { color: hexToInt(primaryDark), backgroundColor: hexToInt(darkBg) }
        : { color: hexToInt(primary), backgroundColor: hexToInt(lightBg) };

    case 'trunk':
      return isDark
        ? { color: hexToInt(primaryDark), backgroundColor: 0x111111, spacing: 8.5, chaos: 2.0 }
        : { color: hexToInt(primary), backgroundColor: hexToInt(lightBg), spacing: 8.5, chaos: 2.0 };

    case 'birds':
      return isDark
        ? { backgroundColor: hexToInt(darkBg), color1: hexToInt(primaryDark), color2: hexToInt(primary) }
        : { backgroundColor: hexToInt(lightBg), color1: hexToInt(primary), color2: hexToInt(primaryDark) };

    case 'net':
      return isDark
        ? { color: hexToInt(primaryDark), backgroundColor: hexToInt(darkBg), points: 13.00, maxDistance: 23.00, spacing: 17.00, scale: 1.00, scaleMobile: 1.00 }
        : { color: hexToInt(primary), backgroundColor: hexToInt(lightBg), points: 13.00, maxDistance: 23.00, spacing: 17.00, scale: 1.00, scaleMobile: 1.00 };

    default:
      return {};
  }
}

interface HeroProps {
  config: HeroConfig;
  social: Social;
  phone: string | null;
  isContactVisible: boolean;
  /** The business's real services — the ticker band lists these (LT-117). */
  appointmentTypes?: AppointmentType[];
  isPreview?: boolean;
  palette?: Palette;
  design?: DesignConfig;
  /** LT-113 seeded per-site variation (LT-053 contract): swaps the poster
   *  template pair, mirrors the poster-split columns, moves decor corners. */
  jitter?: { posterAlt: boolean; flipPosterSplit: boolean; decorStart: boolean };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VANTA_IMPORTERS: Record<string, () => Promise<any>> = {
  clouds: () => import('vanta/dist/vanta.clouds.min'),
  fog: () => import('vanta/dist/vanta.fog.min'),
  clouds2: () => import('vanta/dist/vanta.clouds2.min'),
  topology: () => import('vanta/dist/vanta.topology.min'),
  trunk: () => import('vanta/dist/vanta.trunk.min'),
  birds: () => import('vanta/dist/vanta.birds.min'),
  net: () => import('vanta/dist/vanta.net.min'),
};

const radiusClassMap: Record<BorderRadius, string> = {
  none: 'rounded-none',
  sm: 'rounded',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  full: 'rounded-full',
};

const Hero: React.FC<HeroProps> = ({ config, social, phone, isContactVisible, appointmentTypes, isPreview, palette, design, jitter }) => {
  const { t, language } = useLanguage();
  const { isModalOpen, setIsModalOpen, modalType, handleContactClick } = useContactHandler();

  const vantaRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vantaInstanceRef = useRef<any>(null);
  const isDarkMode = useIsDarkMode();

  // The default background is Vanta fog (LT-071, Erel's decision after the
  // LT-062..069 animated-gradient saga — see the missions log). Stored
  // configs may still say 'gradient'; they render fog.
  const rawBgType = config.bgType ?? 'gradient';
  const bgType = rawBgType === 'gradient' ? 'fog' : rawBgType;

  // Design tokens with fallbacks to legacy bordersType
  const btnRadius = design?.borderRadius
    ? radiusClassMap[design.borderRadius]
    : (config.bordersType ?? 'round') === 'round' ? 'rounded-full' : 'rounded-2xl';
  const imgRadius = btnRadius;
  const buttonStyle = design?.buttonStyle ?? 'gradient';
  const rawHeroLayout = design?.heroLayout ?? 'image-right';
  // LT-113: the two poster compositions are one template family — half the
  // sites of a poster vibe open on the split (image) fold, half on the
  // statement (type-only) fold, seeded per site.
  const heroLayout = jitter?.posterAlt && (rawHeroLayout === 'poster-split' || rawHeroLayout === 'poster-statement')
    ? (rawHeroLayout === 'poster-split' ? 'poster-statement' : 'poster-split')
    : rawHeroLayout;
  const decorStart = jitter?.decorStart ?? false;
  // Arabic cursive joins break under letter-spacing (review finding).
  const noTrack = language === 'ar';
  const animLevel = design?.animLevel ?? 'full';
  const imageTreatment = design?.imageTreatment ?? 'rounded';
  const decor = design?.decor ?? 'none';
  const animD = (base: number) => animLevel === 'none' ? 0 : animLevel === 'minimal' ? base * 0.25 : base;

  // The ticker band reads as a shop sign: the service list, repeated until it
  // fills the width. Falls back to the hero title when a site has no named
  // services yet (a fresh signup before the owner fills the menu), which is
  // what it always showed before LT-117.
  const tickerItems = (appointmentTypes ?? [])
    .map((type) => type.name?.trim())
    .filter((name): name is string => !!name);
  const tickerSource = tickerItems.length ? tickerItems : [config.title];
  const tickerText = Array.from(
    { length: Math.ceil(28 / tickerSource.length) },
    () => tickerSource,
  ).flat().join('  ·  ');

  const vantaKey = [
    bgType,
    isDarkMode ? 'dark' : 'light',
    palette?.colorPrimary       ?? '',
    palette?.colorPrimaryDark   ?? '',
    palette?.colorLightBg       ?? '',
    palette?.colorDarkBg        ?? '',
  ].join('|');

  useEffect(() => {
    if (!vantaRef.current) return;

    if (vantaInstanceRef.current) {
      vantaInstanceRef.current.destroy();
      vantaInstanceRef.current = null;
    }

    let cancelled = false;

    VANTA_IMPORTERS[bgType]().then((mod) => {
      if (cancelled || !vantaRef.current) return;
      vantaInstanceRef.current = mod.default({
        el: vantaRef.current,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        ...buildVantaOptions(bgType, isDarkMode, palette),
      });
    });

    return () => {
      cancelled = true;
      if (vantaInstanceRef.current) {
        vantaInstanceRef.current.destroy();
        vantaInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vantaKey]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: animD(0.3) },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: animD(0.6), ease: "easeOut" },
    },
  };

  const socialLinks = [
    phone && {
      icon: () => (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      onClick: () => handleContactClick('whatsapp', `https://wa.me/${phone?.replace(/[^0-9+]/g, '')}`),
      color: 'bg-[#25D366]/10 text-[#10B981] hover:bg-[#25D366] hover:text-white dark:hover:text-white'
    },
    social.instagram && {
      icon: Instagram,
      href: social.instagram,
      color: 'bg-[#F77EB9]/10 text-[#F77EB9] hover:bg-[#F77EB9] hover:text-white dark:hover:text-white'
    },
    social.tiktok && {
      icon: () => (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      ),
      href: social.tiktok,
      color: 'bg-[#000000]/5 text-black hover:bg-[#000000] hover:text-white dark:bg-[#000000]/10 dark:text-white dark:hover:bg-[#000000]'
    },
    social.facebook && {
      icon: Facebook,
      href: social.facebook,
      color: 'bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white dark:hover:text-white'
    },
    social.x && {
      icon: () => (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      href: social.x,
      color: 'bg-[#000000]/5 text-black hover:bg-[#000000] hover:text-white dark:bg-[#000000]/10 dark:text-white dark:hover:bg-[#000000]'
    },
    phone && {
      icon: Phone,
      onClick: () => handleContactClick('phone', `tel:${phone?.replace(/[^0-9+]/g, '')}`),
      color: 'bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981] hover:text-white dark:hover:text-white'
    }
  ].filter(Boolean);

  // ── Button renderers ──────────────────────────────────────────────────────

  const renderBookButton = (fullWidth = false) => {
    const w = fullWidth ? 'w-full' : '';

    if (buttonStyle === 'solid') {
      return (
        <motion.a
          href="#schedule"
          className={`relative inline-flex items-center justify-center px-8 py-4 bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark ${btnRadius} ${w} shadow-lg hover:opacity-90 transition-opacity`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={t('hero.book')}
        >
          <span className="flex items-center justify-center gap-2">
            <span>{t('hero.book')}</span>
            <Calendar className="h-5 w-5" aria-hidden="true" />
          </span>
        </motion.a>
      );
    }

    if (buttonStyle === 'outline') {
      return (
        <motion.a
          href="#schedule"
          className={`inline-flex items-center justify-center px-8 py-4 border-2 border-primary-readable dark:border-primary-dark-readable text-primary-readable dark:text-primary-dark-readable ${btnRadius} ${w} hover:bg-primary/10 dark:hover:bg-primary-dark/10 transition-colors shadow-lg`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={t('hero.book')}
        >
          <span className="flex items-center justify-center gap-2">
            <span>{t('hero.book')}</span>
            <Calendar className="h-5 w-5" aria-hidden="true" />
          </span>
        </motion.a>
      );
    }

    if (buttonStyle === 'ghost') {
      return (
        <motion.a
          href="#schedule"
          className={`inline-flex items-center justify-center px-8 py-4 text-primary-readable dark:text-primary-dark-readable ${btnRadius} ${w} hover:bg-primary/10 dark:hover:bg-primary-dark/10 transition-colors`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={t('hero.book')}
        >
          <span className="flex items-center justify-center gap-2">
            <span>{t('hero.book')}</span>
            <Calendar className="h-5 w-5" aria-hidden="true" />
          </span>
        </motion.a>
      );
    }

    // gradient (default)
    return (
      <motion.a
        href="#schedule"
        className={`group relative inline-flex items-center justify-center px-8 py-4 bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark ${btnRadius} ${w} shadow-lg hover:shadow-xl overflow-hidden`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        role="button"
        aria-label={t('hero.book')}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary via-accent-violet to-primary dark:from-primary-dark dark:via-accent-cyan dark:to-primary-dark"
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          style={{ backgroundSize: '200% 100%' }}
          aria-hidden="true"
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: "loop", ease: "linear", repeatDelay: 3 }}
          aria-hidden="true"
        />
        <span className="relative text-center flex items-center justify-center gap-2">
          <span>{t('hero.book')}</span>
          <Calendar className="h-5 w-5" aria-hidden="true" />
        </span>
      </motion.a>
    );
  };

  const renderContactButton = (fullWidth = false) => {
    if (!isContactVisible) return null;
    const w = fullWidth ? 'w-full' : '';
    return (
      <motion.a
        href="#contact"
        className={`inline-flex text-center items-center justify-center px-8 py-4 bg-light-surface dark:bg-dark-surface border-2 border-primary-readable dark:border-primary-dark-readable text-primary-readable dark:text-primary-dark-readable ${btnRadius} ${w} hover:bg-primary/5 dark:hover:bg-primary-dark/5 transition-colors shadow-lg hover:shadow-xl`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={t('hero.contact')}
      >
        {t('hero.contact')}
      </motion.a>
    );
  };

  const renderSocialRow = (className = '') => {
    if (!socialLinks.length) return null;
    return (
      <motion.div className={`flex flex-wrap gap-4 ${className}`} variants={itemVariants}>
        {socialLinks.map((s, i) => (
          <motion.button
            key={i}
            onClick={s.onClick || (() => window.open(s.href, '_blank'))}
            className={`p-3 rounded-xl transition-colors ${s.color}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {typeof s.icon === 'function' ? <s.icon /> : <s.icon className="h-6 w-6" />}
          </motion.button>
        ))}
      </motion.div>
    );
  };

  const renderImage = (sizeClass = 'w-full aspect-square') => {
    // Shape per the imageTreatment token. 'circle' forces a square aspect so
    // non-square layout slots (split's 4:5) don't degrade into an ellipse.
    const shapedSize = imageTreatment === 'circle'
      ? sizeClass.replace(/aspect-\S+/g, 'aspect-square')
      : sizeClass;
    const shapeClass =
      imageTreatment === 'circle' ? 'rounded-full'
      : imageTreatment === 'arch' ? 'img-arch'
      : imageTreatment === 'blob' ? 'img-blob'
      : imgRadius; // 'rounded' (and any retired value, e.g. old 'framed'
                   // configs) follows the radius token

    // Fully static in every design (LT-079/080/081, Erel's direction): no
    // float, no pulsing glow, no hover scale, no offset frame border. The
    // neutral drop shadow stays.
    return (
      <div className="relative">
        <img
          src={ImagesService.getInstance().getImage(config.heroImageSrc)}
          alt="intro"
          onError={handleWideImageError}
          className={`relative ${shapedSize} object-cover ${shapeClass} shadow-2xl`}
        />
      </div>
    );
  };

  // ── Layout variants ───────────────────────────────────────────────────────

  const renderContent = () => {
    // ── Centered: image top-center, text below ────────────────────────────
    if (heroLayout === 'centered') {
      return (
        <motion.div
          className="flex flex-col items-center text-center gap-8 py-8"
          variants={containerVariants}
        >
          <motion.div className="max-w-xs sm:max-w-sm" variants={itemVariants}>
            {decor === 'monogram' ? (
              // LT-113 (Firm artboard): the understated bordered monogram in
              // place of a photo — classical firms lead with type, not faces.
              <div className="w-20 h-20 mx-auto border border-primary-readable dark:border-primary-dark-readable flex items-center justify-center" aria-hidden="true">
                <span className="text-4xl text-primary-readable dark:text-primary-dark-readable" style={{ fontFamily: 'inherit' }}>
                  {(config.title || '·').trim().charAt(0)}
                </span>
              </div>
            ) : renderImage('w-48 h-48 sm:w-64 sm:h-64')}
          </motion.div>

          <motion.div className="max-w-2xl" variants={containerVariants}>
            <motion.h1
              className="text-5xl md:text-7xl font-bold text-light-text dark:text-dark-text mb-4 leading-tight"
              variants={itemVariants}
            >
              {config.title}
              <span className="block text-primary-readable dark:text-primary-dark-readable">{config.subtitle}</span>
            </motion.h1>
            <motion.p
              className="text-xl text-light-text/80 dark:text-dark-text/80 mb-8 max-w-xl mx-auto"
              variants={itemVariants}
            >
              {config.description}
            </motion.p>
            <motion.div className="flex flex-col sm:flex-row gap-4 justify-center" variants={itemVariants}>
              {renderBookButton(false)}
              {renderContactButton(false)}
            </motion.div>
          </motion.div>

          {renderSocialRow('justify-center mt-4')}
        </motion.div>
      );
    }

    // ── Poster-statement (LT-113): the Ink-artboard composition — no
    // image, a small label line, then the title stacked over an
    // outline-stroke subtitle. Pure type poster.
    if (heroLayout === 'poster-statement') {
      return (
        <motion.div className="py-10 md:py-16" variants={containerVariants}>
          <motion.div
            className={`text-xs md:text-sm font-semibold ${noTrack ? '' : 'tracking-[0.3em]'} text-light-text/60 dark:text-dark-text/60 uppercase`}
            variants={itemVariants}
          >
            {config.description}
          </motion.div>
          <motion.h1
            className="font-bold text-light-text dark:text-dark-text leading-none mt-6"
            variants={itemVariants}
          >
            {config.title}
          </motion.h1>
          {config.subtitle && (
            <motion.div
              // mt-8, not the old mt-2: both blocks are display type whose
              // glyphs overflow their own (sub-1) line boxes, so a 2-line
              // title's descenders printed straight through the echo's caps.
              className="mt-8"
              variants={itemVariants}
            >
              {/* .text-echo (index.css) owns the stroke, in both themes. It
                  used to be an inline `-webkit-text-stroke: 2px light-text`
                  with a `dark:` CLASS meant to recolor it — but an inline
                  style always beats a class, so the echo stayed near-black in
                  dark mode: an invisible headline on every dark-first vibe.
                  The class also carries the leading, which has to win over the
                  html[data-type-scale] h1 rule. */}
              <h1 className="text-echo font-bold">
                {config.subtitle}
              </h1>
            </motion.div>
          )}
          <motion.div className="flex flex-row flex-wrap items-center gap-4 mt-10" variants={itemVariants}>
            {renderBookButton(false)}
            {renderContactButton(false)}
          </motion.div>
          <motion.div className="mt-10 pt-6 border-t border-light-text/15 dark:border-dark-text/15" variants={itemVariants}>
            {renderSocialRow('justify-start')}
          </motion.div>
        </motion.div>
      );
    }

    // ── Fullbleed (LT-113): the Lens-artboard composition — the image IS
    // the hero; title overlaid on its lower edge.
    if (heroLayout === 'fullbleed') {
      return (
        <motion.div className="relative" variants={containerVariants}>
          <motion.div className="relative h-[60vh] min-h-[24rem] overflow-hidden" variants={itemVariants}>
            <img
              src={ImagesService.getInstance().getImage(config.heroImageSrc)}
              alt={config.title}
              onError={handleWideImageError}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" aria-hidden="true" />
            <div className="absolute bottom-6 start-6 md:bottom-10 md:start-10 text-white max-w-[70%]">
              <div className="text-xs tracking-[0.3em] uppercase text-white/70">{config.subtitle}</div>
              <h1 className="font-bold leading-tight mt-2">{config.title}</h1>
            </div>
            <div className="hidden md:block absolute bottom-10 end-10 text-xs tracking-[0.3em] uppercase text-white/70 max-w-[25%] text-end">
              {config.description}
            </div>
          </motion.div>
          <motion.div className="flex flex-row flex-wrap items-center justify-between gap-4 mt-8" variants={itemVariants}>
            <div className="flex gap-4 flex-wrap">
              {renderBookButton(false)}
              {renderContactButton(false)}
            </div>
            {renderSocialRow('')}
          </motion.div>
        </motion.div>
      );
    }

    // ── Poster-split (LT-109): the Barber-artboard composition — poster
    // headline column beside a tall image block with a solid corner tag,
    // a rule row underneath. The vibe template, faithful to the canvas.
    if (heroLayout === 'poster-split') {
      return (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 items-stretch gap-10 lg:gap-16"
          variants={containerVariants}
        >
          <motion.div className="flex flex-col justify-center py-6" variants={containerVariants}>
            <motion.h1
              className="font-bold text-light-text dark:text-dark-text leading-none"
              variants={itemVariants}
            >
              {config.title}
            </motion.h1>
            {config.subtitle && (
              <motion.div
                className="mt-4 text-2xl md:text-4xl font-bold text-primary-readable dark:text-primary-dark-readable"
                variants={itemVariants}
              >
                {config.subtitle}
              </motion.div>
            )}
            <motion.p
              className="text-lg md:text-xl text-light-text/70 dark:text-dark-text/70 max-w-md mt-6"
              variants={itemVariants}
            >
              {config.description}
            </motion.p>
            <motion.div className="flex flex-row flex-wrap gap-4 mt-8" variants={itemVariants}>
              {renderBookButton(false)}
              {renderContactButton(false)}
            </motion.div>
            <motion.div
              className="mt-10 pt-6 border-t border-light-text/15 dark:border-dark-text/15"
              variants={itemVariants}
            >
              {renderSocialRow('justify-start')}
            </motion.div>
          </motion.div>

          <motion.div className={`relative w-full max-w-md md:max-w-none mx-auto md:mx-0 ${jitter?.flipPosterSplit ? 'md:order-first' : ''}`} variants={itemVariants}>
            <div className="relative h-full min-h-[22rem] md:min-h-[28rem]">
              <img
                src={ImagesService.getInstance().getImage(config.heroImageSrc)}
                alt={config.title}
                onError={handleWideImageError}
                className="absolute inset-0 w-full h-full object-cover shadow-2xl"
              />
              {config.subtitle && (
                <span className="absolute bottom-0 start-0 bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark text-xs font-bold tracking-[0.2em] px-4 py-2 max-w-full truncate">
                  {config.subtitle}
                </span>
              )}
            </div>
          </motion.div>
        </motion.div>
      );
    }

    // ── Text-first (LT-093): centered copy, large image below ─────────────
    // The editorial-stack composition from the vibe canvas: the words lead,
    // then a wide image (arch treatment shines here) anchors the fold.
    if (heroLayout === 'text-first') {
      return (
        <motion.div
          className="flex flex-col items-center text-center gap-8 py-8"
          variants={containerVariants}
        >
          <motion.div className="max-w-3xl" variants={containerVariants}>
            <motion.h1
              className="text-5xl md:text-7xl font-bold text-light-text dark:text-dark-text mb-4 leading-tight"
              variants={itemVariants}
            >
              {config.title}
              <span className="block text-primary-readable dark:text-primary-dark-readable">{config.subtitle}</span>
            </motion.h1>
            <motion.p
              className="text-xl text-light-text/80 dark:text-dark-text/80 mb-8 max-w-xl mx-auto"
              variants={itemVariants}
            >
              {config.description}
            </motion.p>
            <motion.div className="flex flex-col sm:flex-row gap-4 justify-center" variants={itemVariants}>
              {renderBookButton(false)}
              {renderContactButton(false)}
            </motion.div>
          </motion.div>

          <motion.div className="w-full max-w-md sm:max-w-lg md:max-w-xl mt-2" variants={itemVariants}>
            {renderImage('w-full aspect-[4/3]')}
          </motion.div>

          {renderSocialRow('justify-center')}
        </motion.div>
      );
    }

    // ── Split: text column | image column ─────────────────────────────────
    if (heroLayout === 'split') {
      return (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 items-center gap-10 lg:gap-20"
          variants={containerVariants}
        >
          {/* Image — sits on top on mobile, right column on desktop. Capped +
              centered so it never fills the whole column and crowds the text. */}
          <motion.div
            className="order-1 md:order-2 w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto"
            variants={itemVariants}
          >
            {renderImage('w-full aspect-[4/5]')}
          </motion.div>

          <motion.div
            className="order-2 md:order-1 flex flex-col gap-6 text-center md:text-start"
            variants={containerVariants}
          >
            <motion.h1
              className="text-5xl md:text-6xl font-bold text-light-text dark:text-dark-text leading-tight"
              variants={itemVariants}
            >
              {config.title}
              <span className="block text-primary-readable dark:text-primary-dark-readable">{config.subtitle}</span>
            </motion.h1>
            <motion.p
              className="text-xl text-light-text/80 dark:text-dark-text/80"
              variants={itemVariants}
            >
              {config.description}
            </motion.p>
            <motion.div className="flex flex-row gap-4 flex-wrap justify-center md:justify-start" variants={itemVariants}>
              {renderBookButton(false)}
              {renderContactButton(false)}
            </motion.div>
            {renderSocialRow('mt-2 justify-center md:justify-start')}
          </motion.div>
        </motion.div>
      );
    }

    // ── Image-right (default) ─────────────────────────────────────────────
    return (
      <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-6 lg:gap-12">
        <motion.div className="flex-1 text-center md:text-right" variants={containerVariants}>
          <div className="hidden md:block">
            <motion.h1
              className="text-5xl md:text-7xl font-bold text-light-text dark:text-dark-text mb-4 lg:mb-8 leading-tight"
              variants={itemVariants}
            >
              {config.title}
              <span className="block text-primary-readable dark:text-primary-dark-readable">{config.subtitle}</span>
            </motion.h1>
            <motion.p
              className={`text-xl text-light-text/80 dark:text-dark-text/80 mb-6 lg:mb-12 max-w-2xl ${language === 'he' || language === 'ar' ? 'md:me-0 md:ms-auto md:text-right' : 'md:ms-0 md:me-auto md:text-left'}`}
              variants={itemVariants}
            >
              {config.description}
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-end"
              variants={itemVariants}
              role="group"
              aria-label={t('common.actions', { defaultValue: 'Actions' })}
            >
              {renderBookButton(false)}
              {renderContactButton(false)}
            </motion.div>
          </div>
        </motion.div>

        <motion.div className="flex-1 relative w-full md:w-auto pt-6 md:pt-0" variants={itemVariants}>
          <div className="max-w-[12.5rem] sm:max-w-[13.75rem] md:max-w-none mx-auto">
            {renderImage('w-full aspect-square')}
          </div>

          {/* Mobile content — below image */}
          <div className="md:hidden mt-6 text-center px-4">
            <motion.div variants={itemVariants} className="space-y-6 mb-8">
              <motion.h1
                className="text-4xl font-bold text-light-text dark:text-dark-text leading-tight"
                variants={itemVariants}
              >
                {config.title}
                <span className="block text-primary-readable dark:text-primary-dark-readable">{config.subtitle}</span>
              </motion.h1>
              <motion.p
                className="text-lg text-light-text/80 dark:text-dark-text/80 mx-auto"
                variants={itemVariants}
              >
                {config.description}
              </motion.p>
            </motion.div>
            {renderBookButton(true)}
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <>
      <section
        ref={vantaRef}
        id="home"
        className="min-h-screen relative overflow-hidden bg-light-bg dark:bg-dark-bg transition-colors duration-300"
        aria-label={t('hero.welcome_label')}
      >
        {/* Text-protection veil over the Vanta background (LT-060). The
            animation is painted with palette colors, so any text — especially
            primary-colored text — can dissolve into it. A half-strength wash
            of the page background restores a predictable backdrop while
            keeping the animation visible as texture, and it makes the
            readable-primary contrast math meaningful here. Vanta injects its
            canvas as the section's first child, so this sibling paints above
            the canvas and below the content. */}
        <div className="absolute inset-0 bg-light-bg/50 dark:bg-dark-bg/55 pointer-events-none" aria-hidden="true" />

        {/* Vibe signature decorations (LT-107, from the LT-092 canvas). All
            static and aria-hidden — identity, not content.
            z-10 because they are drawn ON the fold, not under it: these are
            siblings that precede the content container, so without it the
            hero image simply painted over them — a stamp or sun sliced in
            half by the photo's edge. */}
        {decor === 'stamp' && (
          <div
            className={`hidden md:flex absolute z-10 top-24 ${decorStart ? 'start-10 lg:start-20' : 'end-10 lg:end-20'} w-28 h-28 rounded-full border-2 border-primary-readable dark:border-primary-dark-readable items-center justify-center -rotate-12 pointer-events-none`}
            aria-hidden="true"
          >
            <div className="w-[5.5rem] h-[5.5rem] rounded-full border border-primary-readable/60 dark:border-primary-dark-readable/60 flex items-center justify-center p-2">
              <span className="text-[11px] font-bold tracking-widest text-center leading-tight text-primary-readable dark:text-primary-dark-readable line-clamp-3">
                {config.title}
              </span>
            </div>
          </div>
        )}
        {decor === 'confetti' && (
          <div className="absolute inset-0 z-10 pointer-events-none" aria-hidden="true">
            <span className="absolute top-[14%] start-[12%] w-3 h-3 rounded-full bg-primary/70 dark:bg-primary-dark/70" />
            <span className="absolute top-[26%] end-[9%] w-2 h-2 rounded-full bg-primary-dark/60 dark:bg-primary/60" />
            <span className="absolute top-[62%] start-[7%] w-2.5 h-2.5 rounded-full bg-primary/50 dark:bg-primary-dark/50" />
            <span className="absolute top-[10%] end-[28%] w-2 h-2 rounded-full bg-primary/40 dark:bg-primary-dark/40" />
            <span className="absolute bottom-[18%] end-[14%] w-3 h-3 rounded-full bg-primary-dark/50 dark:bg-primary/50" />
            <span className="absolute bottom-[30%] start-[22%] w-2 h-2 rounded-full bg-primary/60 dark:bg-primary-dark/60" />
          </div>
        )}
        {decor === 'sun' && (
          <svg
            viewBox="0 0 40 40"
            className={`hidden md:block absolute z-10 top-24 ${decorStart ? 'start-12 lg:start-24' : 'end-12 lg:end-24'} w-14 h-14 text-primary-readable dark:text-primary-dark-readable pointer-events-none`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="20" cy="20" r="8" />
            <path d="M20 4v5M20 31v5M4 20h5M31 20h5M8.7 8.7l3.5 3.5M27.8 27.8l3.5 3.5M31.3 8.7l-3.5 3.5M12.2 27.8l-3.5 3.5" />
          </svg>
        )}

        <motion.div
          className="container mx-auto px-4 pt-16 md:pt-20 lg:pt-32 pb-20 relative"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {renderContent()}

          {/* Social links for image-right layout (centered/split embed them inline) */}
          {heroLayout === 'image-right' && socialLinks.length > 0 && (
            <motion.div
              className="mt-12 flex flex-wrap justify-center gap-4 px-4 sm:px-0"
              variants={itemVariants}
            >
              {socialLinks.map((s, i) => (
                <motion.button
                  key={i}
                  onClick={s.onClick || (() => window.open(s.href, '_blank'))}
                  className={`p-3 rounded-xl transition-colors ${s.color}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {typeof s.icon === 'function' ? <s.icon /> : <s.icon className="h-6 w-6" />}
                </motion.button>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Repeating-text strip (LT-107): the industrial ticker / electric
            marquee band along the hero's bottom edge. Static on purpose.
            It lists what the business actually sells (LT-117) — the same
            services the ledger and the booking form use — instead of the
            hero title over and over. */}
        {(decor === 'ticker' || decor === 'marquee') && (
          <div
            className={`absolute bottom-0 inset-x-0 overflow-hidden whitespace-nowrap py-2 bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark select-none ${decor === 'marquee' ? `font-bold uppercase italic ${noTrack ? '' : 'tracking-widest'} text-sm` : `${noTrack ? '' : 'tracking-[0.25em]'} text-xs font-semibold`}`}
            aria-hidden="true"
          >
            {tickerText}
          </div>
        )}
      </section>

      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contactLink={modalType === 'whatsapp'
          ? `https://wa.me/${phone?.replace(/[^0-9+]/g, '')}`
          : `tel:${phone?.replace(/[^0-9+]/g, '')}`}
        type={modalType}
      />
    </>
  );
};

export default Hero;

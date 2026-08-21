import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Phone, Instagram, Facebook } from 'lucide-react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { ContactModal } from '../ContactModal';
import { useContactHandler } from '../../hooks/useContactHandler';
import { HeroConfig } from '../../models/HeroConfig';
import { Social } from '../../models/Social';
import { Palette } from '../../models/WebsiteConfig';
import { DesignConfig, BorderRadius } from '../../models/DesignConfig';
import ImagesService from '../../services/ImagesService';
import { SiteJitter, createRng } from '../../services/seed';

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
  isPreview?: boolean;
  palette?: Palette;
  design?: DesignConfig;
  jitter?: SiteJitter;
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

const Hero: React.FC<HeroProps> = ({ config, social, phone, isContactVisible, isPreview, palette, design, jitter }) => {
  const c1 = palette?.colorPrimary ?? '#2563eb';
  const c2 = palette?.colorPrimaryDark ?? '#14b8a6';
  const blobColors = [c1, c2, c1];
  // Mouse glow position as motion values: mousemove writes straight to the
  // compositor without re-rendering the component (LT-062 — the old
  // useState version re-rendered the entire Hero on every mouse event).
  const glowX = useMotionValue(-10000);
  const glowY = useMotionValue(-10000);
  const glowSpringX = useSpring(glowX, { damping: 15 });
  const glowSpringY = useSpring(glowY, { damping: 15 });
  const { t, language } = useLanguage();
  const { isModalOpen, setIsModalOpen, modalType, handleContactClick } = useContactHandler();

  const vantaRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vantaInstanceRef = useRef<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

  const bgType = config.bgType ?? 'gradient';
  const isVanta = bgType !== 'gradient';

  // Design tokens with fallbacks to legacy bordersType
  const btnRadius = design?.borderRadius
    ? radiusClassMap[design.borderRadius]
    : (config.bordersType ?? 'round') === 'round' ? 'rounded-full' : 'rounded-2xl';
  const imgRadius = btnRadius;
  const buttonStyle = design?.buttonStyle ?? 'gradient';
  const heroLayout = design?.heroLayout ?? 'image-right';
  const animLevel = design?.animLevel ?? 'full';
  const imageTreatment = design?.imageTreatment ?? 'rounded';
  const animD = (base: number) => animLevel === 'none' ? 0 : animLevel === 'minimal' ? base * 0.25 : base;

  // ── Static composed gradient background (LT-064) ──────────────────────────
  // Third iteration of this background — see the LT-062/063/064 mission-log
  // history. The lesson: every stack of animated full-screen layers here has
  // glitched somewhere (background-string churn → blinking; composited-layer
  // memory → desktop flashing; multi-layer translucent overdraw → scroll
  // glitch). So the entire composition — the two-tone wash plus the three
  // color blobs, at the ORIGINAL 50/75/100% anchors with LT-053 jitter — is
  // painted once into a single background, as cheap as a static image.
  // Movement comes only from a slow opacity crossfade to a second
  // arrangement: one animated property, on one layer, that never repaints.
  const washAlpha = 0.42; // old dedicated wash layer: alpha .6 under opacity-70
  const blobAlpha = 0.18; // old blob layers: alpha .3 under opacity ~.5–.7
  const blobStops = (shift: number, flip: boolean) =>
    [0, 1, 2].map((i) => {
      const off = jitter?.blobOffsets[i] ?? 0;
      const ax = 50 + i * 25 + (flip ? -off : off) + shift;
      const ay = 50 + i * 25 - (flip ? -off : off);
      return `radial-gradient(circle at ${ax}% ${ay}%, ${hexToRgba(blobColors[i], blobAlpha)} 0%, transparent 50%)`;
    }).join(', ');
  const composedBg = [
    `radial-gradient(circle at 0% 0%, ${hexToRgba(c1, washAlpha)} 0%, transparent 50%)`,
    `radial-gradient(circle at 100% 100%, ${hexToRgba(c2, washAlpha)} 0%, transparent 50%)`,
    blobStops(0, false),
  ].join(', ');
  const composedBgAlt = [
    `radial-gradient(circle at 100% 0%, ${hexToRgba(c2, washAlpha)} 0%, transparent 50%)`,
    `radial-gradient(circle at 0% 100%, ${hexToRgba(c1, washAlpha)} 0%, transparent 50%)`,
    blobStops(-8, true),
  ].join(', ');

  const vantaKey = [
    bgType,
    isDarkMode ? 'dark' : 'light',
    palette?.colorPrimary       ?? '',
    palette?.colorPrimaryDark   ?? '',
    palette?.colorLightBg       ?? '',
    palette?.colorDarkBg        ?? '',
  ].join('|');

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Center the glow on the cursor. The disc is a 20vw base scaled 4x
      // around its own center, so the visual center sits at the base
      // center — 10vw from the layer's top-left — plus the translation.
      const half = window.innerWidth * 0.1;
      glowX.set(e.clientX - half);
      glowY.set(e.clientY - half);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isVanta) return;
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [isVanta]);

  useEffect(() => {
    if (!isVanta || !vantaRef.current) return;

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

  // Seeded and memoized: the field is stable per site (LT-053) instead of
  // re-randomizing on every render (each mousemove used to reshuffle it).
  const particles = useMemo(() => {
    const rng = createRng(jitter?.particleSeed ?? 1);
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: 10 + rng() * 80,
      y: 10 + rng() * 80,
      size: rng() * 3 + 1,
      duration: rng() * 15 + 15,
      delay: rng() * 2,
      driftX: rng() * 10 - 5,
      driftY: rng() * 10 - 5,
    }));
  }, [jitter?.particleSeed]);

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
      : imgRadius; // 'rounded' and 'framed' follow the radius token

    return (
      <div className="relative">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent-teal/20 dark:from-primary-dark/10 dark:to-accent-cyan/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: animD(20), repeat: Infinity, repeatType: "reverse", ease: "linear" }}
          aria-hidden="true"
        />
        <motion.div
          className="relative"
          animate={{ y: animLevel === 'none' ? 0 : [-8, 8, -8] }}
          transition={{ duration: animD(jitter?.floatDuration ?? 5), repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        >
          {imageTreatment === 'framed' && (
            <div
              className={`absolute inset-0 translate-x-3 translate-y-3 border-2 border-primary dark:border-primary-dark ${imgRadius}`}
              aria-hidden="true"
            />
          )}
          <motion.img
            src={ImagesService.getInstance().getImage(config.heroImageSrc)}
            alt="intro"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/lightor.png";
            }}
            className={`relative ${shapedSize} object-cover ${shapeClass} shadow-2xl`}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          />
        </motion.div>
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
            {renderImage('w-48 h-48 sm:w-64 sm:h-64')}
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
        {!isVanta && (
          <div className="absolute inset-0 bg-light-bg dark:bg-dark-bg" aria-hidden="true" />
        )}

        {/* Text-protection veil over animated Vanta backgrounds (LT-060).
            The animation is painted with palette colors, so any text —
            especially primary-colored text — can dissolve into it. A
            half-strength wash of the page background restores a predictable
            backdrop while keeping the animation visible as texture, and it
            makes the readable-primary contrast math meaningful here too.
            Vanta injects its canvas as the section's first child, so this
            sibling paints above the canvas and below the content. */}
        {isVanta && (
          <div className="absolute inset-0 bg-light-bg/50 dark:bg-dark-bg/55 pointer-events-none" aria-hidden="true" />
        )}

        {/* Gradient background (LT-064/067). The composition is painted once
            (composedBg) and the ONLY motion is a slow transform drift of the
            whole field plus an opacity crossfade to a second arrangement —
            two oversized (124%) transform-only layers, ~3x viewport of
            texture total (Chromium budget ~8x). Do NOT reintroduce a stack
            of animated full-screen layers or animate `background` strings:
            the LT-062/063/064 log documents how each of those glitched.
            LT-065's drift orbs were pink-on-pink and imperceptible; the
            visible motion now comes from drifting the base field itself. */}
        {!isVanta && (
          <>
            {animLevel === 'none' ? (
              <div className="absolute inset-0" style={{ background: composedBg }} aria-hidden="true" />
            ) : (
              <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                {/* Base field: oversized so a few-vw drift never exposes an
                    edge; the gradients also fade to transparent before the
                    box edge. Transform-only — the paint never changes. */}
                <motion.div
                  className="absolute -inset-[12%]"
                  style={{ background: composedBg, willChange: 'transform' }}
                  animate={{
                    x: ['-4vw', '4vw', '-2vw', '-4vw'],
                    y: ['3vh', '-4vh', '4vh', '3vh'],
                    scale: [1, 1.1, 1.04, 1],
                  }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* Second arrangement, drifting on its own phase and
                    crossfading in and out for slow color variation. */}
                <motion.div
                  className="absolute -inset-[12%]"
                  initial={{ opacity: 0 }}
                  style={{ background: composedBgAlt, willChange: 'transform, opacity' }}
                  animate={{
                    opacity: [0, 0.9, 0],
                    x: ['3vw', '-4vw', '3vw'],
                    y: ['-3vh', '4vh', '-3vh'],
                    scale: [1.06, 1, 1.06],
                  }}
                  transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            )}

            {/* Dark-mode mouse glow: small raster at constant 4x scale,
                translated to the cursor via spring motion values. Starts far
                off-screen until the first move. */}
            <div className="absolute inset-0 overflow-hidden opacity-0 dark:opacity-60 pointer-events-none" aria-hidden="true">
              <motion.div
                className="absolute w-[20vw] h-[20vw]"
                style={{
                  x: glowSpringX,
                  y: glowSpringY,
                  scale: 4,
                  background: 'radial-gradient(circle closest-side, rgba(96, 165, 250, 0.25) 0%, transparent 60%)',
                }}
              />
            </div>
          </>
        )}

        {!isVanta && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {animLevel !== 'none' && particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute w-1 h-1 bg-primary/60 dark:bg-primary-dark/40 rounded-full"
                initial={{ x: `${particle.x}%`, y: `${particle.y}%`, opacity: 0 }}
                animate={{
                  x: [`${particle.x}%`, `${particle.x + particle.driftX}%`, `${particle.x}%`],
                  y: [`${particle.y}%`, `${particle.y + particle.driftY}%`, `${particle.y}%`],
                  opacity: [0, 0.8, 0],
                }}
                transition={{ duration: particle.duration, repeat: Infinity, delay: particle.delay, ease: "linear" }}
                style={{ width: particle.size, height: particle.size, filter: 'blur(0.03125rem)' }}
              />
            ))}
          </div>
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

import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Phone, Instagram, Facebook } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { ContactModal } from '../ContactModal';
import { useContactHandler } from '../../hooks/useContactHandler';
import { HeroConfig } from '../../models/HeroConfig';
import { Social } from '../../models/Social';
import { Palette } from '../../models/WebsiteConfig';
import ImagesService from '../../services/ImagesService';

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

const Hero: React.FC<HeroProps> = ({ config, social, phone, isContactVisible, isPreview, palette }) => {
  const c1 = palette?.colorPrimary ?? '#2563eb';
  const c2 = palette?.colorPrimaryDark ?? '#14b8a6';
  const blobColors = [c1, c2, c1];
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { t, language } = useLanguage();
  const { isModalOpen, setIsModalOpen, modalType, handleContactClick } = useContactHandler();

  const vantaRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [vantaEffect, setVantaEffect] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

  const bgType = config.bgType ?? 'gradient';
  const isVanta = bgType !== 'gradient';
  const isRound = (config.bordersType ?? 'round') === 'round';
  const btnRadius = isRound ? 'rounded-full' : 'rounded-3xl';
  const imgRadius = isRound ? 'rounded-full' : 'rounded-3xl';

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      setMousePosition({ x: clientX - window.innerWidth / 2, y: clientY - window.innerHeight / 2 });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (!isVanta) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const newIsDark = document.documentElement.classList.contains('dark');
          if (newIsDark !== isDarkMode) {
            setIsDarkMode(newIsDark);
            if (vantaEffect) { vantaEffect.destroy(); setVantaEffect(null); }
          }
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });

    const loadVanta = async () => {
      if (!vantaEffect) {
        const VANTA = (await VANTA_IMPORTERS[bgType]()).default;
        setVantaEffect(VANTA({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          ...buildVantaOptions(bgType, isDarkMode, palette),
        }));
      }
    };

    loadVanta();
    return () => {
      if (vantaEffect) vantaEffect.destroy();
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDarkMode, vantaEffect]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.3 },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const particles = Array.from({ length: 30 }, (_, i) => {
    const x = 10 + Math.random() * 80;
    const y = 10 + Math.random() * 80;
    return {
      id: i,
      x,
      y,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 15 + 15,
      delay: Math.random() * 2,
    };
  });

  const socialLinks = [
    phone && {
      icon: () => (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
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
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-6 w-6"
          aria-hidden="true"
        >
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
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
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

  return (
    <>
      <section
        ref={vantaRef}
        id="home"
        className="min-h-screen relative overflow-hidden bg-light-bg dark:bg-dark-bg transition-colors duration-300"
        aria-label={t('hero.welcome_label')}
      >
        {!isVanta && (
          <div
            className="absolute inset-0 bg-light-bg dark:bg-dark-bg"
            aria-hidden="true"
          />
        )}

        {!isVanta && (
          <>
            <div className="absolute inset-0" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0"
                  initial={{ opacity: 0.5 }}
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 0],
                    opacity: [0.5, 0.7, 0.5],
                  }}
                  transition={{
                    duration: 20 + i * 5,
                    repeat: Infinity,
                    delay: i * 5,
                    ease: "linear",
                  }}
                  style={{
                    background: `radial-gradient(circle at ${50 + i * 25}% ${50 + i * 25}%, ${hexToRgba(blobColors[i], 0.3)} 0%, transparent 50%)`,
                  }}
                />
              ))}
            </div>

            <motion.div
              className="absolute inset-0 opacity-70"
              animate={{
                background: [
                  `radial-gradient(circle at 0% 0%, ${hexToRgba(c1, 0.6)} 0%, transparent 50%), radial-gradient(circle at 100% 100%, ${hexToRgba(c2, 0.6)} 0%, transparent 50%)`,
                  `radial-gradient(circle at 100% 0%, ${hexToRgba(c2, 0.6)} 0%, transparent 50%), radial-gradient(circle at 0% 100%, ${hexToRgba(c1, 0.6)} 0%, transparent 50%)`,
                  `radial-gradient(circle at 50% 50%, ${hexToRgba(c1, 0.6)} 0%, transparent 50%), radial-gradient(circle at 0% 0%, ${hexToRgba(c2, 0.6)} 0%, transparent 50%)`,
                ],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "linear",
              }}
              aria-hidden="true"
            />

            <motion.div
              className="absolute inset-0 opacity-0 dark:opacity-60 pointer-events-none"
              animate={{
                background: `radial-gradient(circle 40vw at ${mousePosition.x + window.innerWidth / 2}px ${mousePosition.y + window.innerHeight / 2}px, rgba(96, 165, 250, 0.25), transparent 60%)`,
              }}
              transition={{ type: "spring", damping: 15 }}
              aria-hidden="true"
            />
          </>
        )}

        {!isVanta && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute w-1 h-1 bg-primary/60 dark:bg-primary-dark/40 rounded-full"
                initial={{
                  x: `${particle.x}%`,
                  y: `${particle.y}%`,
                  opacity: 0,
                }}
                animate={{
                  x: [
                    `${particle.x}%`,
                    `${particle.x + (Math.random() * 10 - 5)}%`,
                    `${particle.x}%`
                  ],
                  y: [
                    `${particle.y}%`,
                    `${particle.y + (Math.random() * 10 - 5)}%`,
                    `${particle.y}%`
                  ],
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: particle.duration,
                  repeat: Infinity,
                  delay: particle.delay,
                  ease: "linear",
                }}
                style={{
                  width: particle.size,
                  height: particle.size,
                  filter: 'blur(0.03125rem)',
                }}
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
          <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-6 lg:gap-12">
            <motion.div className="flex-1 text-center md:text-right" variants={containerVariants}>
              {/* Desktop content */}
              <div className="hidden md:block">
                <motion.h1
                  className="text-5xl md:text-7xl font-bold text-light-text dark:text-dark-text mb-4 lg:mb-8 leading-tight"
                  variants={itemVariants}
                >
                  {config.title}
                  <span className="block text-primary dark:text-primary-dark">{config.subtitle}</span>
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
                  <motion.a
                    href="#schedule"
                    className={`group relative inline-flex items-center justify-center px-8 py-4 bg-primary dark:bg-primary-dark text-white dark:text-dark-surface ${btnRadius} shadow-lg hover:shadow-xl overflow-hidden`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    role="button"
                    aria-label={t('hero.book')}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary via-accent-violet to-primary dark:from-primary-dark dark:via-accent-cyan dark:to-primary-dark"
                      animate={{
                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      style={{
                        backgroundSize: '200% 100%',
                      }}
                      aria-hidden="true"
                    />

                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: "loop",
                        ease: "linear",
                        repeatDelay: 3
                      }}
                      aria-hidden="true"
                    />

                    <span className="relative text-center flex items-center justify-center gap-2">
                      <span>{t('hero.book')}</span>
                      <motion.div
                        initial="initial"
                        whileHover="hover"
                        variants={{
                          initial: { x: 0 },
                          hover: { x: language === 'he' ? -5 : 5 }
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20
                        }}
                      >
                        <Calendar
                          className="h-5 w-5"
                          aria-hidden="true"
                        />
                      </motion.div>
                    </span>
                  </motion.a>

                  {isContactVisible && <motion.a
                    href="#contact"
                    className={`inline-flex text-center items-center justify-center px-8 py-4 bg-light-surface dark:bg-dark-surface border-2 border-primary dark:border-primary-dark text-primary dark:text-primary-dark ${btnRadius} hover:bg-primary/5 dark:hover:bg-primary-dark/5 transition-colors shadow-lg hover:shadow-xl`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    role="button"
                    aria-label={t('hero.contact')}
                  >
                    {t('hero.contact')}
                  </motion.a>}
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              className="flex-1 relative w-full md:w-auto pt-6 md:pt-0"
              variants={itemVariants}
            >
              <div className="max-w-[12.5rem] sm:max-w-[13.75rem] md:max-w-none mx-auto">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent-teal/20 dark:from-primary-dark/10 dark:to-accent-cyan/10 rounded-full blur-3xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "linear",
                  }}
                  aria-hidden="true"
                />

                <motion.div
                  className="relative"
                  animate={{
                    y: [-8, 8, -8],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                  }}
                >
                  <motion.img
                    src={ImagesService.getInstance().getImage(config.heroImageSrc)}
                    alt="intro"
                    onError={(e) => {
                      e.currentTarget.onerror = null; // Prevent infinite loop
                      e.currentTarget.src = "/lightor.png";
                    }}
                    className={`relative w-full aspect-square object-cover ${imgRadius} border-4 border-white dark:border-dark-surface shadow-2xl`}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  />
                </motion.div>
              </div>

              {/* Mobile content */}
              <div className="md:hidden mt-6 text-center px-4">
                <motion.div variants={itemVariants} className="space-y-6 mb-8">
                  <motion.h1
                    className="text-4xl font-bold text-light-text dark:text-dark-text leading-tight"
                    variants={itemVariants}
                  >
                    {config.title}
                    <span className="block text-primary dark:text-primary-dark">{config.subtitle}</span>
                  </motion.h1>

                  <motion.p
                    className="text-lg text-light-text/80 dark:text-dark-text/80 mx-auto"
                    variants={itemVariants}
                  >
                    {config.description}
                  </motion.p>
                </motion.div>

                <motion.a
                  href="#schedule"
                  className={`group relative inline-flex items-center justify-center w-full px-8 py-4 bg-primary dark:bg-primary-dark text-white dark:text-dark-surface ${btnRadius} shadow-lg hover:shadow-xl overflow-hidden`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  role="button"
                  aria-label={t('hero.book')}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary via-accent-violet to-primary dark:from-primary-dark dark:via-accent-cyan dark:to-primary-dark"
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    style={{
                      backgroundSize: '200% 100%',
                    }}
                    aria-hidden="true"
                  />

                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      repeatType: "loop",
                      ease: "linear",
                      repeatDelay: 3
                    }}
                    aria-hidden="true"
                  />

                  <span className="relative flex items-center justify-center gap-2">
                    <span>{t('hero.book')}</span>
                    <motion.div
                      initial="initial"
                      whileHover="hover"
                      variants={{
                        initial: { x: 0 },
                        hover: { x: language === 'he' ? -5 : 5 }
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20
                      }}
                    >
                      <Calendar
                        className="h-5 w-5"
                        aria-hidden="true"
                      />
                    </motion.div>
                  </span>
                </motion.a>
              </div>
            </motion.div>
          </div>

          {/* Social Links */}
          {socialLinks.length > 0 && (
            <motion.div
              className="mt-12 flex flex-wrap justify-center gap-4 px-4 sm:px-0"
              variants={itemVariants}
            >
              {socialLinks.map((social, index) => (
                <motion.button
                  key={index}
                  onClick={social.onClick || (() => window.open(social.href, '_blank'))}
                  className={`p-3 rounded-xl transition-colors ${social.color}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {typeof social.icon === 'function' ?
                    <social.icon /> :
                    <social.icon className="h-6 w-6" />
                  }
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
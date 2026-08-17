import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { PortfolioConfig } from '../models/PortfolioConfig';
import { PortfolioLayout } from '../models/DesignConfig';
import globals from '../services/globals';
import ImagesService from '../services/ImagesService';

interface PortfolioProps {
  config: PortfolioConfig;
  layout?: PortfolioLayout;
  /** Seeded per-site (LT-053): rotates the masonry aspect cycle. */
  masonryPhase?: number;
}

// Masonry cycles aspect ratios so the columns stagger even when every source
// image has the same dimensions.
const MASONRY_ASPECTS = ['aspect-[4/3]', 'aspect-square', 'aspect-[3/4]'];

const Portfolio: React.FC<PortfolioProps> = ({ config, layout = 'grid', masonryPhase = 0 }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGridView] = useState(config.isGrid);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const slideRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % config.items.length);
  }, [config.items.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + config.items.length) % config.items.length);
  }, [config.items.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    const touchDiff = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(touchDiff) > minSwipeDistance) {
      if (touchDiff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    setTouchStart(0);
    setTouchEnd(0);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isGridView) {
      if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      }
    }
  }, [isGridView, prevSlide, nextSlide]);

  useEffect(() => {
    const slideElement = slideRef.current;
    if (slideElement && !isGridView) {
      slideElement.addEventListener('touchstart', handleTouchStart as any);
      slideElement.addEventListener('touchmove', handleTouchMove as any);
      slideElement.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        slideElement.removeEventListener('touchstart', handleTouchStart as any);
        slideElement.removeEventListener('touchmove', handleTouchMove as any);
        slideElement.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isGridView, handleKeyDown]);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100vw' : '-100vw',
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100vw' : '-100vw',
      opacity: 0
    })
  };


  return (
    <section
      id="portfolio"
      className="section-y bg-light-bg dark:bg-dark-bg transition-colors duration-300"
      aria-label={t('nav.portfolio')}
    >
      <motion.div
        className="container mx-auto px-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <motion.div
          className="text-center mb-20"
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2
            className="text-4xl font-bold text-light-text dark:text-dark-text mb-6"
            id="portfolio-title"
          >
            {config.title}
          </h2>
          <div
            className="heading-accent mx-auto mb-8"
            aria-hidden="true"
          />
          <p className="text-xl text-light-text/80 dark:text-dark-text/80 max-w-2xl mx-auto mb-8">
            {config.description}
          </p>
          {/* 
          <motion.div
            className="inline-flex items-center gap-2 bg-light-surface dark:bg-dark-surface p-1 rounded-lg shadow-md"
            whileHover={{ scale: 1.05 }}
            role="group"
            aria-label={t('common.view_options', { defaultValue: 'View options' })}
          >
            <motion.button
              onClick={() => setIsGridView(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${!isGridView
                  ? 'bg-primary dark:bg-primary-dark text-white dark:text-dark-surface'
                  : 'text-light-text dark:text-dark-text hover:bg-light-gray dark:hover:bg-dark-gray'
                }`}
              whileTap={{ scale: 0.95 }}
              aria-pressed={!isGridView}
              aria-label={t('portfolio.view.slideshow')}
            >
              <Slideshow className="h-4 w-4" aria-hidden="true" />
              <span>{t('portfolio.view.slideshow')}</span>
            </motion.button>
            <motion.button
              onClick={() => setIsGridView(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${isGridView
                  ? 'bg-primary dark:bg-primary-dark text-white dark:text-dark-surface'
                  : 'text-light-text dark:text-dark-text hover:bg-light-gray dark:hover:bg-dark-gray'
                }`}
              whileTap={{ scale: 0.95 }}
              aria-pressed={isGridView}
              aria-label={t('portfolio.view.grid')}
            >
              <Grid className="h-4 w-4" aria-hidden="true" />
              <span>{t('portfolio.view.grid')}</span>
            </motion.button>
          </motion.div> */}
        </motion.div>

        <div className="max-w-6xl mx-auto">
          {isGridView ? (
            (() => {
              // Shared still-image card; the portfolioLayout token picks how
              // the cards are arranged (grid / masonry / filmstrip). The
              // carousel below (isGrid=false) is owner-chosen and unaffected.
              const itemCard = (item: typeof config.items[number], index: number, aspect: string, extra = '') => (
                <motion.div
                  key={index}
                  className={`group relative ${aspect} rounded-design-card overflow-hidden shadow-card ${extra}`}
                  role="gridcell"
                  tabIndex={0}
                  aria-label={`${item.title}: ${item.description}`}
                >
                  <img
                    src={ImagesService.getInstance().getImage(item.url)}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    aria-hidden="true"
                  >
                    <div className="absolute bottom-0 inset-x-0 p-4 md:p-6">
                      <h3 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">{item.title}</h3>
                      <p className="text-sm md:text-base text-white/80">{item.description}</p>
                    </div>
                  </div>
                </motion.div>
              );

              if (layout === 'masonry') {
                return (
                  <div
                    className="columns-1 md:columns-2 lg:columns-3 gap-8"
                    role="grid"
                    aria-label={t('portfolio.grid_label')}
                  >
                    {config.items.map((item, index) =>
                      itemCard(item, index, MASONRY_ASPECTS[(index + masonryPhase) % MASONRY_ASPECTS.length], 'mb-8 break-inside-avoid')
                    )}
                  </div>
                );
              }

              if (layout === 'filmstrip') {
                return (
                  <div
                    className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory"
                    role="grid"
                    aria-label={t('portfolio.grid_label')}
                  >
                    {config.items.map((item, index) =>
                      itemCard(item, index, 'aspect-[3/4]', 'flex-none w-64 sm:w-72 snap-center')
                    )}
                  </div>
                );
              }

              // 'grid' (default): uniform three-column grid. object-contain
              // preserved here — it predates LT-051 and owners' grid images
              // rely on it not cropping.
              return (
                <div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                  role="grid"
                  aria-label={t('portfolio.grid_label')}
                >
                  {config.items.map((item, index) => (
                    <motion.div
                      key={index}
                      className="group relative aspect-[4/3] rounded-design-card overflow-hidden shadow-card"
                      role="gridcell"
                      tabIndex={0}
                      aria-label={`${item.title}: ${item.description}`}
                    >
                      <img
                        src={ImagesService.getInstance().getImage(item.url)}
                        alt={item.title}
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        aria-hidden="true"
                      >
                        <div className="absolute bottom-0 inset-x-0 p-4 md:p-6">
                          <h3 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">{item.title}</h3>
                          <p className="text-sm md:text-base text-white/80">{item.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              );
            })()
          ) : (
            <div
              ref={slideRef}
              className="relative aspect-square md:aspect-[15/10] overflow-hidden rounded-design-card shadow-2xl bg-light-surface dark:bg-dark-bg mx-2 md:mx-0"
              role="region"
              aria-label={t('portfolio.slideshow_label')}
              aria-roledescription="carousel"
              aria-live="polite"
            >
              <div className="sr-only">
                {t('portfolio.slideshow_instruction')}
              </div>

              <AnimatePresence initial={false} custom={currentSlide}>
                <motion.div
                  key={currentSlide}
                  custom={currentSlide}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                  }}
                  className="absolute inset-0"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${config.items[currentSlide].title}: ${config.items[currentSlide].description}`}
                >
                  <div className="relative h-full">
                    <img
                      src={ImagesService.getInstance().getImage(config.items[currentSlide].url)}
                      alt={config.items[currentSlide].title}
                      className="w-full h-full object-contain"
                      draggable="false"
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"
                      aria-hidden="true"
                    >
                      <div className="absolute bottom-0 inset-x-0 p-4 md:p-8">
                        <h3 className="text-xl md:text-3xl font-bold mb-1 md:mb-2 text-white">
                          {config.items[currentSlide].title}
                        </h3>
                        <p className="text-sm md:text-lg text-white/80">
                          {config.items[currentSlide].description}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                <motion.button
                  onClick={prevSlide}
                  className="z-10 pointer-events-auto p-3 bg-light-surface/40 dark:bg-dark-surface/40 rounded-full shadow-lg hover:bg-light-surface/70 dark:hover:bg-dark-surface/70 transition-colors backdrop-blur-sm"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={t('portfolio.slideshow_prev')}
                >
                  <ChevronLeft className={`h-6 w-6 text-light-text dark:text-dark-text ${language === 'he' ? 'rotate-180' : ''}`} aria-hidden="true" />
                </motion.button>

                <motion.button
                  onClick={nextSlide}
                  className="z-10 pointer-events-auto p-3 bg-light-surface/40 dark:bg-dark-surface/40 rounded-full shadow-lg hover:bg-light-surface/70 dark:hover:bg-dark-surface/70 transition-colors backdrop-blur-sm"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={t('portfolio.slideshow_next')}
                >
                  <ChevronRight className={`h-6 w-6 text-light-text dark:text-dark-text ${language === 'he' ? 'rotate-180' : ''}`} aria-hidden="true" />
                </motion.button>
              </div>

              <div
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10 md:flex hidden"
                role="tablist"
                aria-label={t('portfolio.slideshow_label')}
              >
                {config.items.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${currentSlide === index
                      ? 'bg-primary dark:bg-primary-dark scale-125'
                      : 'bg-light-gray dark:bg-dark-gray'
                      }`}
                    role="tab"
                    aria-selected={currentSlide === index}
                    aria-label={t('portfolio.slideshow_dot', { index: index + 1 })}
                    aria-controls={`slide-${index}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
};

export default Portfolio;
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { PortfolioConfig } from '../models/PortfolioConfig';
import globals from '../services/globals';

interface PortfolioProps {
  config: PortfolioConfig;
}

const Portfolio: React.FC<PortfolioProps> = ({ config }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGridView] = useState(config.isGrid);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const slideRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

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
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };


  return (
    <section
      id="portfolio"
      className="py-32 bg-gradient-to-b from-light-surface to-light-bg dark:from-dark-surface dark:to-dark-bg transition-colors duration-300"
      aria-label="Portfolio"
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
            className="w-24 h-1 bg-primary dark:bg-primary-dark mx-auto mb-8"
            aria-hidden="true"
          />
          <p className="text-xl text-light-text/80 dark:text-dark-text/80 max-w-2xl mx-auto mb-8">
            {config.description}
          </p>
          {/* 
          <motion.div
            className="inline-flex items-center space-x-2 bg-light-surface dark:bg-dark-surface p-1 rounded-lg shadow-md"
            whileHover={{ scale: 1.05 }}
            role="group"
            aria-label="View options"
          >
            <motion.button
              onClick={() => setIsGridView(false)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${!isGridView
                  ? 'bg-primary dark:bg-primary-dark text-white dark:text-dark-surface'
                  : 'text-light-text dark:text-dark-text hover:bg-light-gray dark:hover:bg-dark-gray'
                }`}
              whileTap={{ scale: 0.95 }}
              aria-pressed={!isGridView}
              aria-label="Switch to slideshow view"
            >
              <Slideshow className="h-4 w-4" aria-hidden="true" />
              <span>{t('portfolio.view.slideshow')}</span>
            </motion.button>
            <motion.button
              onClick={() => setIsGridView(true)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${isGridView
                  ? 'bg-primary dark:bg-primary-dark text-white dark:text-dark-surface'
                  : 'text-light-text dark:text-dark-text hover:bg-light-gray dark:hover:bg-dark-gray'
                }`}
              whileTap={{ scale: 0.95 }}
              aria-pressed={isGridView}
              aria-label="Switch to grid view"
            >
              <Grid className="h-4 w-4" aria-hidden="true" />
              <span>{t('portfolio.view.grid')}</span>
            </motion.button>
          </motion.div> */}
        </motion.div>

        <div className="max-w-6xl mx-auto">
          {isGridView ? (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              role="grid"
              aria-label="Portfolio grid"
            >
              {config.items.map((item, index) => (
                <motion.div
                  key={index}
                  className="group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg"
                  role="gridcell"
                  tabIndex={0}
                  aria-label={`${item.title}: ${item.description}`}
                >
                  <img
                    src={globals.imagesUrl + item.url}
                    alt={item.title}
                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    aria-hidden="true"
                  >
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                      <h3 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">{item.title}</h3>
                      <p className="text-sm md:text-base text-white/80">{item.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div
              ref={slideRef}
              className="relative aspect-square md:aspect-[15/10] overflow-hidden rounded-3xl shadow-2xl bg-light-surface dark:bg-dark-bg mx-2 md:mx-0"
              role="region"
              aria-label="Portfolio slideshow"
              aria-roledescription="carousel"
              aria-live="polite"
            >
              <div className="sr-only">
                Use left and right arrow keys to navigate between slides
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
                      src={globals.imagesUrl + config.items[currentSlide].url}
                      alt={config.items[currentSlide].title}
                      className="w-full h-full object-contain"
                      draggable="false"
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"
                      aria-hidden="true"
                    >
                      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
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
                  aria-label="Previous slide"
                >
                  <ChevronLeft className={`h-6 w-6 text-light-text dark:text-dark-text ${language === 'he' ? 'rotate-180' : ''}`} aria-hidden="true" />
                </motion.button>

                <motion.button
                  onClick={nextSlide}
                  className="z-10 pointer-events-auto p-3 bg-light-surface/40 dark:bg-dark-surface/40 rounded-full shadow-lg hover:bg-light-surface/70 dark:hover:bg-dark-surface/70 transition-colors backdrop-blur-sm"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Next slide"
                >
                  <ChevronRight className={`h-6 w-6 text-light-text dark:text-dark-text ${language === 'he' ? 'rotate-180' : ''}`} aria-hidden="true" />
                </motion.button>
              </div>

              <div
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10 md:flex hidden"
                role="tablist"
                aria-label="Slide dots"
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
                    aria-label={`Go to slide ${index + 1}`}
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
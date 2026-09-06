import React, { useEffect, useState } from 'react';
import { Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { revealVariants } from '../../services/reveal';
import { TestimonialsConfig } from '../../models/TestimonialsConfig';
import type { TestimonialsLayout, SectionHeader, RevealStyle } from '../../models/DesignConfig';
import SectionHeading from './SectionHeading';
import type { SectionTone } from '../SectionDivider';

interface TestimonialsProps {
  config: TestimonialsConfig;
  /** Section background tone — assigned by App's flow builder (LT-086). */
  tone: SectionTone;
  /** Skeleton variant (LT-093): 'cards' is the pre-LT-093 rendering. */
  layout?: TestimonialsLayout;
  header?: SectionHeader;
  /** LT-126: per-site motion profile. */
  reveal?: RevealStyle;
}

const TONE_BG: Record<SectionTone, string> = {
  bg: 'bg-light-bg dark:bg-dark-bg',
  surface: 'bg-light-surface dark:bg-dark-surface',
};

// Bubbles paint their own fill (the tail must match it exactly), so they use
// the opposite tone of the section instead of the card-design background.
const OPPOSITE_TONE_BG: Record<SectionTone, string> = {
  bg: 'bg-light-surface dark:bg-dark-surface',
  surface: 'bg-light-bg dark:bg-dark-bg',
};

const LEGACY_VARIANTS = {
  container: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  },
  item: {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  },
};

const Testimonials: React.FC<TestimonialsProps> = ({ config, tone, layout = 'cards', header, reveal }) => {
  const { container: containerVariants, item: itemVariants } = revealVariants(reveal, LEGACY_VARIANTS);
  // LT-126 'spotlight': one voice at a time, rotating on its own.
  const [spot, setSpot] = useState(0);
  const count = config.items.length;
  useEffect(() => {
    if (layout !== 'spotlight' || count < 2) return;
    const id = window.setInterval(() => setSpot((s) => (s + 1) % count), 6000);
    return () => window.clearInterval(id);
  }, [layout, count]);

  if (layout === 'marquee') {
    // Cards drifting across the section; two copies loop seamlessly.
    const loops = count >= 3;
    const track = loops ? [...config.items, ...config.items] : config.items;
    return (
      <section id="testimonials" className={`section-y ${TONE_BG[tone]} transition-colors duration-300 overflow-hidden`}>
        <div className="container mx-auto px-4">
          <SectionHeading title={config.title} variant={header} mb="mb-12" />
        </div>
        <div className={`flex gap-6 w-max px-4 ${loops ? 'lt-marquee' : ''}`}>
          {track.map((item, i) => (
            <figure key={i} className="card-design p-8 w-80 flex-none flex flex-col" aria-hidden={i >= count ? true : undefined}>
              <Quote className="h-6 w-6 text-primary-readable dark:text-primary-dark-readable mb-4" aria-hidden="true" />
              <blockquote className="text-light-text/90 dark:text-dark-text/90 leading-relaxed flex-grow">{item.text}</blockquote>
              <figcaption className="mt-6 font-semibold text-light-text dark:text-dark-text">{item.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    );
  }

  if (layout === 'spotlight') {
    const item = config.items[spot % Math.max(count, 1)];
    return (
      <section id="testimonials" className={`section-y ${TONE_BG[tone]} transition-colors duration-300`}>
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <SectionHeading title={config.title} variant={header} mb="mb-12" />
          <Quote className="h-10 w-10 text-primary-readable dark:text-primary-dark-readable mx-auto mb-8" aria-hidden="true" />
          <div className="min-h-[10rem]" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.figure
                key={spot}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5 }}
              >
                <blockquote className="text-2xl md:text-4xl leading-snug text-light-text dark:text-dark-text">{item?.text}</blockquote>
                <figcaption className="mt-8 text-sm tracking-widest font-semibold text-primary-readable dark:text-primary-dark-readable">— {item?.name}</figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>
          {count > 1 && (
            <div className="mt-8 flex justify-center gap-2" role="tablist">
              {config.items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === spot % count}
                  aria-label={String(i + 1)}
                  onClick={() => setSpot(i)}
                  className={`h-2.5 rounded-full transition-all ${i === spot % count ? 'w-8 bg-primary dark:bg-primary-dark' : 'w-2.5 bg-light-text/25 dark:bg-dark-text/25'}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
  <section
    id="testimonials"
    className={`section-y ${TONE_BG[tone]} transition-colors duration-300`}
  >
    <motion.div
      className="container mx-auto px-4"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={containerVariants}
    >
      <motion.div variants={itemVariants}>
        <SectionHeading title={config.title} variant={header} mb="mb-16" />
      </motion.div>

      {layout === 'quote' ? (
        // One voice at a time: each quote gets the full width and a large
        // setting — the industrial/atelier/heritage treatment.
        <motion.div className="max-w-3xl mx-auto space-y-20" variants={containerVariants}>
          {config.items.map((item, i) => (
            <motion.figure key={i} className="text-center" variants={itemVariants}>
              <Quote className="h-8 w-8 text-primary-readable dark:text-primary-dark-readable mx-auto mb-6" aria-hidden="true" />
              <blockquote className="text-2xl md:text-3xl leading-relaxed text-light-text dark:text-dark-text">
                {item.text}
              </blockquote>
              <figcaption className="mt-6 text-sm tracking-widest font-semibold text-primary-readable dark:text-primary-dark-readable">
                — {item.name}
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      ) : layout === 'bubbles' ? (
        // Speech bubbles (festive): self-painted fill with a matching tail.
        <motion.div
          className="grid gap-10 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto"
          variants={containerVariants}
        >
          {config.items.map((item, i) => (
            <motion.figure key={i} className="relative" variants={itemVariants}>
              <div className={`${OPPOSITE_TONE_BG[tone]} rounded-[26px] p-8 shadow-lg relative`}>
                <blockquote className="text-light-text/90 dark:text-dark-text/90 leading-relaxed">
                  {item.text}
                </blockquote>
                <div
                  className={`${OPPOSITE_TONE_BG[tone]} absolute -bottom-2 start-10 w-4 h-4 rotate-45`}
                  aria-hidden="true"
                />
              </div>
              <figcaption className="mt-5 ms-10 font-semibold text-primary-readable dark:text-primary-dark-readable">
                {item.name}
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      ) : (
        <motion.div
          className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto"
          variants={containerVariants}
        >
          {config.items.map((item, i) => (
            <motion.figure key={i} className="card-design p-8 flex flex-col" variants={itemVariants}>
              <Quote className="h-6 w-6 text-primary-readable dark:text-primary-dark-readable mb-4" aria-hidden="true" />
              <blockquote className="text-light-text/90 dark:text-dark-text/90 leading-relaxed flex-grow">
                {item.text}
              </blockquote>
              <figcaption className="mt-6 font-semibold text-light-text dark:text-dark-text">
                {item.name}
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      )}
    </motion.div>
  </section>
  );
};

export default Testimonials;

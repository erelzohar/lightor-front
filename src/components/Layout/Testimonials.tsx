import React from 'react';
import { Quote } from 'lucide-react';
import { motion } from 'framer-motion';
import { TestimonialsConfig } from '../../models/TestimonialsConfig';
import type { TestimonialsLayout } from '../../models/DesignConfig';
import type { SectionTone } from '../SectionDivider';

interface TestimonialsProps {
  config: TestimonialsConfig;
  /** Section background tone — assigned by App's flow builder (LT-086). */
  tone: SectionTone;
  /** Skeleton variant (LT-093): 'cards' is the pre-LT-093 rendering. */
  layout?: TestimonialsLayout;
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const Testimonials: React.FC<TestimonialsProps> = ({ config, tone, layout = 'cards' }) => (
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
      <motion.div variants={itemVariants} className="text-center mb-16">
        <h2 className="text-4xl font-bold text-light-text dark:text-dark-text mb-6">{config.title}</h2>
        <div className="heading-accent mx-auto mb-8" aria-hidden="true"></div>
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

export default Testimonials;

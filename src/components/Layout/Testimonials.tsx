import React from 'react';
import { Quote } from 'lucide-react';
import { motion } from 'framer-motion';
import { TestimonialsConfig } from '../../models/TestimonialsConfig';
import type { SectionTone } from '../SectionDivider';

interface TestimonialsProps {
  config: TestimonialsConfig;
  /** Section background tone — assigned by App's flow builder (LT-086). */
  tone: SectionTone;
}

const TONE_BG: Record<SectionTone, string> = {
  bg: 'bg-light-bg dark:bg-dark-bg',
  surface: 'bg-light-surface dark:bg-dark-surface',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const Testimonials: React.FC<TestimonialsProps> = ({ config, tone }) => (
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
    </motion.div>
  </section>
);

export default Testimonials;

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { generateDelay, reducedMotion } from '../services/generateReveal';

/**
 * The "generating" cascade a preview plays when the register wizard posts a
 * fresh config: each section arrives in turn, top to bottom, lifting into
 * place under a light sweep — the page assembling itself rather than simply
 * appearing. Only the preview asks for it (PREVIEW_DATA carries `generate`);
 * a real site never sees this, and neither does anyone with reduced-motion on.
 *
 * `seq` changes per generation, so a refine replays the cascade from the top.
 */

interface GenerateRevealProps {
  /** 0 = off; any other value plays the cascade (re-keyed per value). */
  seq: number;
  index: number;
  children: ReactNode;
}

const GenerateReveal = ({ seq, index, children }: GenerateRevealProps) => {
  if (!seq || reducedMotion()) return <>{children}</>;
  const delay = generateDelay(index);
  return (
    <motion.div
      key={seq}
      className="relative"
      initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
      {/* The sweep: a soft light band crossing the section as it lands. */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.14) 50%, transparent 70%)' }}
        initial={{ x: '-100%', opacity: 1 }}
        animate={{ x: '100%', opacity: 0 }}
        transition={{ duration: 0.9, delay: delay + 0.1, ease: 'easeOut' }}
      />
    </motion.div>
  );
};

export default GenerateReveal;

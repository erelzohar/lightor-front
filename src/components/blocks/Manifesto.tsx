import React from 'react';
import { useEditAttrs } from '../../services/editMode';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG, displayFontFor } from './blockUtils';

interface Props { text: string; tone?: SectionTone; /** LT-243: `blocks.<id>.props`. */ basePath?: string; /** LT-538: how the style sets the line. */ look?: string }

/** LT-136: one display-size line across the page — the most "canvas" block. */
const Manifesto: React.FC<Props> = ({ text, tone = 'bg', basePath, look = 'display' }) => {
  const { language } = useLanguage();
  const ed = useEditAttrs();
  const font = displayFontFor(language);
  const enter = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

  // LT-538: the same line in each style's manner.
  // 'ruled' (atelier, heritage): centred and modest, between two thin rules.
  if (look === 'ruled') {
    return (
      <section className={`section-y ${TONE_BG[tone]} transition-colors duration-300`}>
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <span className="block w-16 h-px mx-auto bg-primary-readable dark:bg-primary-dark-readable" aria-hidden="true" />
          <motion.p {...ed(basePath && `${basePath}.text`)} className="my-8 leading-snug text-light-text dark:text-dark-text" style={{ fontFamily: font, fontSize: 'clamp(1.75rem, 4vw, 3rem)', textWrap: 'balance' }} {...enter}>{text}</motion.p>
          <span className="block w-16 h-px mx-auto bg-primary-readable dark:bg-primary-dark-readable" aria-hidden="true" />
        </div>
      </section>
    );
  }
  // 'outline' (underground): the whole line as a hollow stroke.
  if (look === 'outline') {
    return (
      <section className={`section-y ${TONE_BG[tone]} transition-colors duration-300`}>
        <div className="container mx-auto px-4">
          <motion.p {...ed(basePath && `${basePath}.text`)} className="text-echo font-bold m-0" style={{ fontFamily: font, fontSize: 'clamp(2.75rem, 8vw, 6.5rem)', textWrap: 'balance' }} {...enter}>{text}</motion.p>
        </div>
      </section>
    );
  }
  // 'marker' (electric, festive): the words run over with the site's colour.
  if (look === 'marker') {
    return (
      <section className={`section-y ${TONE_BG[tone]} transition-colors duration-300`}>
        <div className="container mx-auto px-4 text-center">
          <motion.p {...ed(basePath && `${basePath}.text`)} className="font-bold leading-relaxed m-0 text-light-text dark:text-dark-text" style={{ fontFamily: font, fontSize: 'clamp(2rem, 5.5vw, 4.5rem)' }} {...enter}>
            <span className="[box-decoration-break:clone] [-webkit-box-decoration-break:clone] px-3 py-1 bg-primary/25 dark:bg-primary-dark/30 rounded-md">{text}</span>
          </motion.p>
        </div>
      </section>
    );
  }
  // 'soft' (serene, earthy): the line resting in a tinted rounded shape.
  if (look === 'soft') {
    return (
      <section className={`section-y ${TONE_BG[tone]} transition-colors duration-300`}>
        <div className="container mx-auto px-4">
          <motion.p {...ed(basePath && `${basePath}.text`)} className="m-0 mx-auto max-w-4xl rounded-[3rem] bg-primary/10 dark:bg-primary-dark/15 px-8 py-14 md:px-16 md:py-20 text-center leading-snug text-light-text dark:text-dark-text" style={{ fontFamily: font, fontSize: 'clamp(1.75rem, 4vw, 3rem)', textWrap: 'balance' }} {...enter}>{text}</motion.p>
        </div>
      </section>
    );
  }

  return (
    <section className={`section-y ${TONE_BG[tone]} transition-colors duration-300`}>
      <div className="container mx-auto px-4">
        <motion.p
          {...ed(basePath && `${basePath}.text`)}
          className="font-bold leading-none text-light-text dark:text-dark-text m-0"
          style={{ fontFamily: displayFontFor(language), fontSize: 'clamp(2.5rem, 7vw, 6rem)', textWrap: 'balance' }}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {text}
        </motion.p>
      </div>
    </section>
  );
};
export default Manifesto;

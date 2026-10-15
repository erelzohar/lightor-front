import React, { useState, useEffect, useId, useRef } from 'react';
import { X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { useDialogFocus } from '../hooks/useDialogFocus';

/** How long after the page opens the owner's message appears. */
export const INTRO_POPUP_DELAY_MS = 5000;

interface IntroPopupProps {
  config: {
    visible: boolean;
    value: string;
  };
}

const IntroPopup: React.FC<IntroPopupProps> = ({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();
  const boxRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // LT-346: a real dialog — focus inside, Escape, Tab kept in, focus back.
  useDialogFocus(isOpen, boxRef, () => setIsOpen(false));

  // Erel (LT-346): five seconds after the page opens, so the visitor sees the
  // site first (it used to cover it after one second).
  useEffect(() => {
      const timer = setTimeout(() => setIsOpen(true), INTRO_POPUP_DELAY_MS);
      return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="intro-popup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <motion.div
            key="popup-content"
            ref={boxRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-dark-surface rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary-dark/10 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-primary dark:text-primary-dark" />
                  </div>
                  <h3 id={titleId} className="text-xl font-semibold text-light-text dark:text-dark-text">
                    {t('intro.title')}
                  </h3>
                </div>
                <motion.button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label={t('a11y.menu.close')}
                  className="p-2 hover:bg-light-gray dark:hover:bg-dark-gray rounded-full transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-5 w-5 text-light-text/60 dark:text-dark-text/60" aria-hidden="true" />
                </motion.button>
              </div>

              {/* Content */}
              <div className="bg-light-gray/30 dark:bg-dark-gray/30 rounded-xl p-4 mb-6">
                <p className="text-start text-lg leading-relaxed text-light-text dark:text-dark-text">
                  {config.value}
                </p>
              </div>

              {/* Action button */}
              <motion.button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full bg-primary dark:bg-primary-dark text-white dark:text-dark-surface py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t('intro.button')}
              </motion.button>
            </div>

            {/* LT-346: no auto-close — a message that vanished after 5 s
                left too little time to read it (WCAG 2.2.1); it stays until
                the visitor closes it. */}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroPopup;

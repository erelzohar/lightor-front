import React, { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

interface IntroPopupProps {
  config: {
    visible: boolean;
    value: string;
  };
}

const IntroPopup: React.FC<IntroPopupProps> = ({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
 const { t, language } = useLanguage();
  
  useEffect(() => {
      const timer = setTimeout(() => setIsOpen(true), 1000);
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
                  <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">
                    {t('intro.title')}
                  </h3>
                </div>
                <motion.button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-light-gray dark:hover:bg-dark-gray rounded-full transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-5 w-5 text-light-text/60 dark:text-dark-text/60" />
                </motion.button>
              </div>

              {/* Content */}
              <div className="bg-light-gray/30 dark:bg-dark-gray/30 rounded-xl p-4 mb-6">
                <p className="text-right text-lg leading-relaxed text-light-text dark:text-dark-text">
                  {config.value}
                </p>
              </div>

              {/* Action button */}
              <motion.button
                onClick={() => setIsOpen(false)}
                className="w-full bg-primary dark:bg-primary-dark text-white dark:text-dark-surface py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t('intro.button')}
              </motion.button>
            </div>

            {/* Auto-close bar */}
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-primary dark:bg-primary-dark"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
              onAnimationComplete={() => setIsOpen(false)}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroPopup;

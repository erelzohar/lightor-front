import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <motion.button
      onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}
      className="p-2 rounded-full bg-light-gray dark:bg-dark-surface hover:bg-primary/10 dark:hover:bg-primary-dark/10 transition-colors"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="font-medium text-light-text dark:text-dark-text">
        {language === 'en' ? 'עב' : 'EN'}
      </span>
    </motion.button>
  );
};

export default LanguageSwitcher;
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const NotFound = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const moveX = clientX - window.innerWidth / 2;
      const moveY = clientY - window.innerHeight / 2;
      setMousePosition({ x: moveX, y: moveY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Base background */}
      <div
        className="absolute inset-0 bg-light-bg dark:bg-dark-bg transition-colors duration-300"
        aria-hidden="true"
      />

      {/* Animated mesh gradients - Base layer */}
      <div className="absolute inset-0" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0"
            initial={{ opacity: 0.5 }}
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 0],
              opacity: [0.5, 0.7, 0.5],
            }}
            transition={{
              duration: 20 + i * 5,
              repeat: Infinity,
              delay: i * 5,
              ease: "linear",
            }}
            style={{
              background: `radial-gradient(circle at ${50 + i * 25}% ${50 + i * 25}%, rgba(${i === 0 ? '37, 99, 235' : i === 1 ? '20, 184, 166' : '167, 139, 250'}, 0.3) 0%, transparent 50%)`,
            }}
          />
        ))}
      </div>

      {/* Animated gradient mesh - Middle layer */}
      <motion.div
        className="absolute inset-0 opacity-70"
        animate={{
          background: [
            'radial-gradient(circle at 0% 0%, rgba(37, 99, 235, 0.6) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(20, 184, 166, 0.6) 0%, transparent 50%)',
            'radial-gradient(circle at 100% 0%, rgba(167, 139, 250, 0.6) 0%, transparent 50%), radial-gradient(circle at 0% 100%, rgba(96, 165, 250, 0.6) 0%, transparent 50%)',
            'radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.6) 0%, transparent 50%), radial-gradient(circle at 0% 0%, rgba(20, 184, 166, 0.6) 0%, transparent 50%)',
          ],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear",
        }}
        aria-hidden="true"
      />

      {/* Interactive light effect - dark mode only */}
      <motion.div
        className="absolute inset-0 opacity-0 dark:opacity-60 pointer-events-none"
        animate={{
          background: `radial-gradient(circle 600px at ${mousePosition.x + window.innerWidth / 2}px ${mousePosition.y + window.innerHeight / 2}px, rgba(96, 165, 250, 0.25), transparent 60%)`,
        }}
        transition={{ type: "spring", damping: 15 }}
        aria-hidden="true"
      />

      <motion.div
        className="relative max-w-2xl w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* 404 Number */}
        <div className="mb-8">
          <div className="text-[150px] md:text-[200px] font-bold leading-none bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent-violet to-primary dark:from-primary-dark dark:via-accent-cyan dark:to-primary-dark">
            404
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl md:text-4xl font-bold text-light-text dark:text-dark-text mb-4">
          {t('notfound.title')}
        </h1>

        <p className="text-lg text-light-text/80 dark:text-dark-text/80 mb-8">
          {t('notfound.message')}
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            onClick={handleHome}
            className="inline-flex items-center justify-center px-8 py-4 bg-primary dark:bg-primary-dark text-white dark:text-dark-surface rounded-full shadow-lg hover:shadow-xl backdrop-blur-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="flex items-center justify-center gap-2">
              <Home className="h-5 w-5" />
              <span>{t('notfound.button.home')}</span>
            </span>
          </motion.button>

          <motion.button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center px-8 py-4 border-2 border-primary dark:border-primary-dark text-primary dark:text-primary-dark rounded-full hover:bg-primary/5 dark:hover:bg-primary-dark/5 transition-colors shadow-lg hover:shadow-xl backdrop-blur-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="flex items-center justify-center gap-2">
              <RefreshCcw className="h-5 w-5" />
              <span>{t('notfound.button.refresh')}</span>
            </span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
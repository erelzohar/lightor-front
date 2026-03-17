import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingProps {
  isLoading: boolean;
  onLoadingComplete?: () => void;
}

const Loading: React.FC<LoadingProps> = ({ isLoading, onLoadingComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      onLoadingComplete?.();
    }
  }, [isLoading, onLoadingComplete]);

  useEffect(() => {
    if (isLoading) {
      const timer = setInterval(() => {
        setProgress(prev => (prev >= 100 ? 100 : prev + 1));
      }, 20);

      return () => clearInterval(timer);
    }
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-light-surface dark:bg-dark-surface"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative flex flex-col items-center">
            <motion.div
              className="w-32 h-32 relative"
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "reverse",
                ease: [0.22, 1, 0.36, 1]
              }}
            >
              <motion.div
                className="absolute inset-0"
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut"
                }}
              >
                <img
                  src="/ez-logo-black.png"
                  alt="Logo Dark"
                  className="w-full h-full object-contain dark:opacity-0 transition-opacity duration-300"
                />
                <img
                  src="/ez-logo-white.png"
                  alt="Logo Light"
                  className="absolute inset-0 w-full h-full object-contain opacity-0 dark:opacity-100 transition-opacity duration-300"
                />
              </motion.div>
            </motion.div>

            <motion.div 
              className="mt-12 w-48"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="h-1 bg-light-gray dark:bg-dark-gray rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary dark:bg-primary-dark"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <motion.div 
                className="mt-2 text-center text-sm font-medium text-light-text/60 dark:text-dark-text/60"
                animate={{
                  scale: progress === 100 ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 0.2 }}
              >
                {progress}%
              </motion.div>
            </motion.div>

            {/* Animated background effects */}
            <div className="absolute inset-0 -z-10" aria-hidden="true">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary-dark/20 dark:from-primary-dark/20 dark:to-primary/20 rounded-full blur-2xl"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Loading;
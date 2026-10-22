import React, { useId, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { DialogTop } from './ui/DialogTop';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
}

export function LegalModal({ isOpen, onClose, title, content }: LegalModalProps) {
  const { t } = useLanguage();
  const boxRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // LT-346: a real dialog — focus inside, Escape, Tab kept in, focus back.
  useDialogFocus(isOpen, boxRef, onClose);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            ref={boxRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            // LT-446: the title and the X stay on top; only the text scrolls.
            className="bg-white dark:bg-dark-surface rounded-2xl max-w-2xl w-full max-h-[85svh] flex flex-col overflow-hidden text-start"
            onClick={e => e.stopPropagation()}
          >
            <DialogTop
              titleId={titleId}
              title={title}
              level={3}
              onClose={onClose}
              closeLabel={t('a11y.menu.close')}
              className="px-6 pt-5 pb-3 border-b border-gray-100 dark:border-white/10"
              titleClassName="text-2xl font-bold text-gray-900 dark:text-white"
              buttonClassName="bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-100 dark:hover:bg-white/20"
            />
            {/* Focusable, so the keyboard can scroll a text with no links in it. */}
            <div tabIndex={0} className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6" data-testid="dialog-text">
              <div className="prose prose-lg max-w-none text-gray-600 dark:text-gray-300">
                {content}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
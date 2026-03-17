import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone } from 'lucide-react';
import * as QRCode from 'qrcode.react';
import { useLanguage } from '../contexts/LanguageContext';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactLink: string;
  type: 'whatsapp' | 'phone';
}

export function ContactModal({ isOpen, onClose, contactLink, type }: ContactModalProps) {
  const { language, t } = useLanguage();
  const isRTL = language === 'he';
  const isWhatsApp = type === 'whatsapp';

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-light-surface dark:bg-dark-surface rounded-2xl p-6 max-w-sm w-full relative"
            onClick={e => e.stopPropagation()}
            role="document"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-light-text/50 dark:text-dark-text/50 hover:text-light-text dark:hover:text-dark-text transition-colors p-2 rounded-full hover:bg-light-gray dark:hover:bg-dark-gray"
              aria-label={t('contact.modal.close')}
            >
              <X className="w-6 h-6" aria-hidden="true" />
            </button>

            <div className="text-center">
              <h3
                id="contact-modal-title"
                className="text-xl font-bold text-light-text dark:text-dark-text mb-4"
              >

                {isWhatsApp ? t('contact.modal.scan.title') : t('contact.modal.call.title')}
              </h3>

              {isWhatsApp ? (
                <>
                  <div
                    className="flex justify-center mb-6"
                    aria-label={t('contact.modal.qr.label')}
                  >
                    <QRCode.QRCodeSVG
                      value={contactLink}
                      size={200}
                      level="H"
                      includeMargin
                      className="rounded-lg"
                    />
                  </div>
                  <p className="text-light-text/80 dark:text-dark-text/80 mb-6">
                    {t('contact.modal.scan.message')}
                  </p>
                </>
              ) : (
                <div className="mb-6">
                  <p className="text-light-text/80 dark:text-dark-text/80 text-lg">
                    {contactLink.replace(/[^0-9+]/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
                  </p>
                </div>
              )}

              <div className="border-t border-light-gray dark:border-dark-gray pt-6">
                <p className="text-light-text/60 dark:text-dark-text/60 mb-4">
                  {isWhatsApp
                    ? t('contact.modal.or.whatsapp')
                    : t('contact.modal.or.call')
                  }
                </p>
                <motion.a
                  href={contactLink}
                  target={isWhatsApp ? "_blank" : undefined}
                  rel={isWhatsApp ? "noopener noreferrer" : undefined}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3 ${isWhatsApp
                    ? 'bg-[#25D366] hover:bg-[#22c35e]'
                    : 'bg-[#10B981] hover:bg-[#059669]'
                    } text-white rounded-xl transition-colors duration-300 font-medium`}
                  aria-label={
                    isWhatsApp ? t('contact.modal.button.whatsapp') : t('contact.modal.button.call')
                  }
                >
                  {isWhatsApp ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                      aria-hidden="true"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  ) : (
                    <Phone className="w-5 h-5" />
                  )}
                  <span>
                    {isWhatsApp ? t('contact.modal.link.text.whatsapp') : t('contact.modal.link.text.call')}
                  </span>
                </motion.a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
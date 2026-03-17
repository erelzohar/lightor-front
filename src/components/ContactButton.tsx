import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, AlertTriangle, X, MessageCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { ContactModal } from './ContactModal';
import { useContactHandler } from '../hooks/useContactHandler';

interface ContactButtonProps {
  phone: string;
}

const WhatsAppIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    height="20"
    width="20"
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const ContactButton: React.FC<ContactButtonProps> = ({ phone }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { language, t } = useLanguage();
  const { isModalOpen, setIsModalOpen, modalType, handleContactClick } = useContactHandler();

  const contactOptions = [
    {
      icon: Phone,
      label: t('contact.option.call'),
      onClick: () => handleContactClick('phone', `tel:${phone}`),
      color: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-400'
    },
    {
      icon: WhatsAppIcon,
      label: t('contact.option.whatsapp'),
      onClick: () => handleContactClick('whatsapp', `https://wa.me/${phone.replace(/[^0-9+]/g, '')}`),
      color: 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] dark:text-[#25D366] dark:hover:bg-[#25D366]'
    },
    {
      icon: AlertTriangle,
      label: t('contact.option.report'),
      action: 'mailto:support@styletime.com?subject=Problem%20Report',
      color: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500 dark:text-amber-400 dark:hover:bg-amber-400'
    }
  ];

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="absolute bottom-0 left-12 mb-2 bg-white dark:bg-dark-surface rounded-lg shadow-lg p-4 min-w-[240px]"
          >
            <div className="space-y-3">
              {contactOptions.map((option, index) => (
                <motion.button
                  key={index}
                  onClick={option.onClick || (() => window.open(option.action, '_blank'))}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${option.color} hover:text-white group w-full`}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {typeof option.icon === 'function' ? (
                    <option.icon />
                  ) : (
                    <option.icon className="h-5 w-5" />
                  )}
                  <span className="text-sm font-medium">{option.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-3 rounded-full shadow-lg transition-all ${isOpen
            ? 'bg-red-500 text-white rotate-0'
            : 'bg-white dark:bg-dark-surface text-primary dark:text-primary-dark rotate-0'
          }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label={t('contact.button.options')}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Phone className="h-6 w-6" aria-hidden="true" />
        )}
      </motion.button>

      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contactLink={modalType === 'whatsapp'
          ? `https://wa.me/${phone.replace(/[^0-9+]/g, '')}`
          : `tel:${phone}`}
        type={modalType}
      />
    </div>
  );
};

export default ContactButton;
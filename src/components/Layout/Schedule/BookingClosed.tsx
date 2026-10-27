import React from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ContactModal } from '../../ContactModal';
import { useContactHandler } from '../../../hooks/useContactHandler';
import { telHref, whatsAppHref } from '../../../utils/phone';

/**
 * In the booking form's place while the site is not taking bookings online
 * (LT-458): the business's payment failed, its free period's month is full,
 * or the free plan's month is - the server says which (`bookingClosed`), or
 * refuses the booking itself when the cached config lagged. The visitor can
 * still reach the business: call, or WhatsApp when its number takes it. The
 * contact form's closed state (LT-197), for bookings.
 */
const BookingClosed: React.FC<{ phone: string }> = ({ phone }) => {
  const { t } = useLanguage();
  const { isModalOpen, setIsModalOpen, modalType, handleContactClick } = useContactHandler();
  const phoneTel = telHref(phone);
  const waHref = whatsAppHref(phone);

  return (
    <div className="card-design space-y-6 p-8 text-center max-w-2xl mx-auto" data-testid="booking-closed">
      <p className="text-lg text-light-text dark:text-dark-text">{t('schedule.closedOnline')}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={() => handleContactClick('phone', phoneTel)}
          className="flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark py-3 px-6 rounded-design shadow-lg hover:shadow-xl transition-all"
        >
          <Phone className="h-5 w-5" aria-hidden="true" />
          <span>{t('contact.option.call')}</span>
        </button>
        {waHref && (
          <button
            type="button"
            onClick={() => handleContactClick('whatsapp', waHref)}
            className="flex items-center justify-center gap-2 border-2 border-primary dark:border-primary-dark text-primary-readable dark:text-primary-dark-readable py-3 px-6 rounded-design transition-all"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            <span>{t('contact.option.whatsapp')}</span>
          </button>
        )}
      </div>
      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contactLink={modalType === 'whatsapp' && waHref ? waHref : phoneTel}
        type={modalType}
      />
    </div>
  );
};

export default BookingClosed;

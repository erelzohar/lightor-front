import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, User, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { ContactConfig } from '../../models/ContactConfig';
import { ContactLayout, SectionHeader } from '../../models/DesignConfig';
import SectionHeading from './SectionHeading';
import { ContactModal } from '../../components/ContactModal';
import { useContactHandler } from '../../hooks/useContactHandler';
import smsService from '../../services/SmsService';

// Optional throughout: a business may have no premises, and the API stores an
// address only when it carries real values.
interface Address {
  state?: string;
  city?: string;
  street?: string;
  other?: string;
}

interface ContactInfo {
  phone: string;
  mail: string;
}

interface ContactProps {
  config: ContactConfig;
  address?: Address;
  contact: ContactInfo;
  workingDays: (string | null)[];
  isPreview?: boolean;
  layout?: ContactLayout;
  header?: SectionHeader;
  sectionIndex?: number;
}

const MaterialInput = ({
  icon: Icon,
  label,
  value,
  onChange,
  error,
  type = "text",
  required = true,
  multiline = false,
  name,
  id
}) => (
  <div className="relative pt-2">
    <label
      htmlFor={id}
      className="absolute start-10 -top-0 px-2 text-sm font-medium text-primary dark:text-primary-dark bg-light-surface dark:bg-dark-surface"
    >
      {label}
    </label>
    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
      <Icon className="h-5 w-5 text-primary dark:text-primary-dark" aria-hidden="true" />
    </div>
    {multiline ? (
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        name={name}
        rows={4}
        className={`w-full ps-10 pe-4 py-3 bg-transparent border-2 ${error
          ? 'border-red-500 dark:border-red-500'
          : 'border-primary/30 dark:border-primary-dark/30 focus:border-primary dark:focus:border-primary-dark'
          } rounded-design-sm transition-all outline-none text-light-text dark:text-dark-text resize-none`}
        aria-required={required}
        aria-invalid={!!error}
      />
    ) : (
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        name={name}
        className={`w-full ps-10 pe-4 py-3 bg-transparent border-2 ${error
          ? 'border-red-500 dark:border-red-500'
          : 'border-primary/30 dark:border-primary-dark/30 focus:border-primary dark:focus:border-primary-dark'
          } rounded-design-sm transition-all outline-none text-light-text dark:text-dark-text`}
        aria-required={required}
        aria-invalid={!!error}
      />
    )}
    {error && (
      <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
    )}
  </div>
);

const Contact: React.FC<ContactProps> = ({ config, address, contact, workingDays, isPreview, layout = 'split', header, sectionIndex }) => {
  // 'split' = info column beside the form; 'stacked' = one narrow centered
  // column with the info as a chip row above the form.
  const isStacked = layout === 'stacked';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: ''
  });
  const [formErrors, setFormErrors] = useState({
    name: '',
    phone: '',
    message: ''
  });
  const { t, language } = useLanguage();
  const { isModalOpen, setIsModalOpen, modalType, handleContactClick } = useContactHandler();

  // Address is optional and any individual part may be missing — a business
  // can have no premises at all. Join only what exists, so an absent address
  // yields '' rather than ", , , " plus a maps link to nowhere.
  const getFullAddress = () => {
    if (!address) return '';
    return [address.street, address.other, address.city, address.state]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(', ');
  };

  const formatWorkingHours = () => {
    const days = language === 'he'
      ? ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return workingDays
      .map((hours, index) => ({
        day: t(`day.${index}`),
        // Hours may hold several comma-separated ranges (breaks, LT-057):
        // format each range, join with ", ". Hebrew keeps the raw 24h ranges.
        hours: hours === null
          ? t('time.closed')
          : language === 'he'
            ? hours.split(',').map(range => range.trim()).filter(Boolean).join(', ')
            : hours.split(',').map(range => range.trim()).filter(Boolean).map(range =>
              range.split('-').map(time => {
                const [h, m] = time.split(':');
                const hour = parseInt(h);
                return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
              }).join(' - ')
            ).join(', ')
      }))
      .filter(schedule => schedule.hours !== t('time.closed'));
  };

  const validateForm = () => {
    const errors = {
      name: '',
      phone: '',
      message: ''
    };

    if (formData.name.length < 2 || formData.name.length > 50) {
      errors.name = t('contact.validation.name');
    }

    if (!formData.phone.startsWith('05')) {
      errors.phone = t('contact.validation.phone.start');
    } else if (formData.phone.length !== 10) {
      errors.phone = t('contact.validation.phone.length');
    } else if (!/^\d+$/.test(formData.phone)) {
      errors.phone = t('contact.validation.phone.digits');
    }

    if (formData.message.trim().length < 10) {
      errors.message = t('contact.validation.message');
    }

    setFormErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (!isPreview) {
        // The server finds the owner by subdomain and emails them; nothing
        // about the recipient travels from the browser. (LT-035)
        const subdomain = window.location.hostname.split('.')[0];
        const res = await smsService.sendContactMessage(subdomain, formData);

        if (!res) throw "";
      }
      setIsSuccess(true);
      // Reset form after showing success message
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({ name: '', phone: '', message: '' });
      }, 3000);
    } catch (err) {
      setError(t('schedule.error'));
      setTimeout(() => {
        setError(null)
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value;

    if (field === 'phone') {
      processedValue = value.replace(/\D/g, '').slice(0, 10);
    } else if (field === 'name') {
      processedValue = value.slice(0, 50);
    }

    setFormData(prev => ({ ...prev, [field]: processedValue }));
    setFormErrors(prev => ({ ...prev, [field]: '' }));
    setError(null);
  };

  const fullAddress = getFullAddress();

  // The full one-line join runs long (street, floor, room, city, country), so
  // the card shows it as two lines: premises details, then city + state. The
  // single-line form still feeds the maps link and the aria-label.
  const addressLines = address
    ? [
      [address.street, address.other].map((part) => part?.trim()).filter(Boolean).join(', '),
      [address.city, address.state].map((part) => part?.trim()).filter(Boolean).join(', ')
    ].filter(Boolean)
    : [];

  const contactInfo = [
    // Location card only when there is an address to point at.
    ...(fullAddress ? [{
      icon: MapPin,
      title: t('about.location'),
      content: fullAddress,
      action: `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`,
      isLink: true,
      color: 'bg-primary/10 text-primary dark:bg-primary-dark/10 dark:text-primary-dark'
    }] : []),
    {
      icon: Phone,
      title: t('about.phone'),
      content: contact.phone,
      action: () => handleContactClick('phone', `tel:${contact.phone.replace(/[^0-9+]/g, '')}`),
      isLink: false,
      color: 'bg-primary/10 text-primary dark:bg-primary-dark/10 dark:text-primary-dark'
    },
    {
      icon: Mail,
      title: t('about.email'),
      content: contact.mail,
      action: `mailto:${contact.mail}`,
      isLink: true,
      color: 'bg-primary/10 text-primary dark:bg-primary-dark/10 dark:text-primary-dark'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <>
      <section
        id="contact"
        className="section-y bg-light-bg dark:bg-dark-bg transition-colors duration-300 relative overflow-hidden"
        aria-label="Contact us"
      >
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          style={{
            // Glow follows the site's palette — this was a hardcoded violet
            // that ignored the configured colors entirely.
            backgroundImage: 'radial-gradient(circle at center, rgb(var(--color-primary) / 0.18) 0%, transparent 50%)',
            backgroundSize: '100% 100%',
          }}
        />

        <motion.div
          className="container mx-auto px-4 relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <SectionHeading
              title={config.title}
              description={config.description}
              variant={header}
              index={sectionIndex}
              mb="mb-20"
              descClass="text-xl text-light-text/80 dark:text-dark-text/80 max-w-2xl mx-auto"
              titleId="contact-title"
            />
          </motion.div>

          <div className={isStacked ? 'max-w-2xl mx-auto flex flex-col gap-12' : 'grid md:grid-cols-2 gap-12 max-w-6xl mx-auto'}>
            <motion.div variants={containerVariants}>
              <div
                className={isStacked ? 'flex flex-wrap justify-center gap-x-12 gap-y-8' : 'space-y-8'}
                role="list"
                aria-label="Contact information"
              >
                {contactInfo.map((item, index) => (
                  <motion.div
                    key={index}
                    className={isStacked ? 'flex flex-col items-center text-center gap-3' : 'flex items-start gap-8'}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    role="listitem"
                  >
                    <div
                      className={`w-12 h-12 ${item.color} rounded-design-sm flex items-center justify-center flex-shrink-0`}
                      aria-hidden="true"
                    >
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-1 text-light-text dark:text-dark-text">
                        {item.title}
                      </h4>
                      {item.isLink ? (
                        <a
                          href={item.action}
                          className="text-light-text/80 dark:text-dark-text/80 hover:text-primary dark:hover:text-primary-dark transition-colors"
                          target={item.icon === MapPin ? "_blank" : undefined}
                          rel={item.icon === MapPin ? "noopener noreferrer" : undefined}
                          aria-label={`${item.title}: ${item.content}`}
                        >
                          {item.icon === MapPin && addressLines.length > 1
                            ? addressLines.map((line) => (
                              <span key={line} className="block">{line}</span>
                            ))
                            : item.content}
                        </a>
                      ) : (
                        <button
                          onClick={item.action}
                          className="text-light-text/80 dark:text-dark-text/80 hover:text-primary dark:hover:text-primary-dark transition-colors"
                        >
                          {item.content}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                className="card-design mt-12 p-6"
                variants={itemVariants}
              >
                <h4 className="font-semibold text-lg mb-4 text-light-text dark:text-dark-text">
                  {t('about.hours')}
                </h4>
                <div className="space-y-2">
                  {formatWorkingHours().map((schedule, index) => (
                    <p key={index} className="text-light-text/80 dark:text-dark-text/80">
                      {`${schedule.day}: ${schedule.hours}`}
                    </p>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            <motion.div variants={containerVariants}>
              <motion.form
                onSubmit={handleSubmit}
                className="card-design space-y-6 p-8"
                variants={itemVariants}
                aria-labelledby="contact-form-title"
              >
                <h3 id="contact-form-title" className="sr-only">Contact Form</h3>

                <MaterialInput
                  icon={User}
                  label={t('contact.form.name')}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  name="name"
                  id="contact-name"
                  error={formErrors.name}
                />

                <MaterialInput
                  icon={Phone}
                  label={t('contact.form.phone')}
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  type="tel"
                  name="phone"
                  id="contact-phone"
                  error={formErrors.phone}
                />

                <MaterialInput
                  icon={MessageSquare}
                  label={t('contact.form.message')}
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  multiline
                  name="message"
                  id="contact-message"
                  error={formErrors.message}
                />

                <motion.button
                  type="submit"
                  className="w-full bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark py-4 px-6 rounded-design transition-all relative overflow-hidden shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isSubmitting || !formData.name || !formData.phone || !formData.message}
                  aria-disabled={isSubmitting || !formData.name || !formData.phone || !formData.message}
                  aria-busy={isSubmitting}
                >
                  <motion.span
                    initial={false}
                    animate={{
                      opacity: isSubmitting ? 0 : 1,
                      y: isSubmitting ? -20 : 0
                    }}
                    className="flex items-center justify-center gap-2"
                  >
                    <span>{t('contact.form.send')}</span>
                    <Send className="h-5 w-5" aria-hidden="true" />
                  </motion.span>
                  {isSubmitting && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      aria-hidden="true"
                    >
                      <div className="w-6 h-6 border-3 border-on-primary dark:border-on-primary-dark border-t-transparent rounded-full animate-spin" />
                    </motion.div>
                  )}
                </motion.button>

                <AnimatePresence>
                  {isSuccess && (
                    <motion.div
                      className="text-emerald-500 dark:text-emerald-400 text-center flex items-center justify-center gap-2"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      role="alert"
                      aria-live="polite"
                    >
                      <CheckCircle className="h-5 w-5" aria-hidden="true" />
                      <span>{t('contact.form.success')}</span>
                    </motion.div>
                  )}
                  {error && (
                    <motion.div
                      className="text-red-500 dark:text-red-400 text-center flex items-center justify-center gap-2"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      role="alert"
                      aria-live="polite"
                    >
                      <XCircle className="h-5 w-5" aria-hidden="true" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.form>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contactLink={modalType === 'whatsapp'
          ? `https://wa.me/${contact.phone.replace(/[^0-9+]/g, '')}`
          : `tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
        type={modalType}
      />
    </>
  );
};

export default Contact;
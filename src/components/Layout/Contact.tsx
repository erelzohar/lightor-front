import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, User, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { ContactConfig } from '../../models/ContactConfig';
import { ContactModal } from '../../components/ContactModal';
import { useContactHandler } from '../../hooks/useContactHandler';
import smsService from '../../services/SmsService';

interface Address {
  state: string;
  city: string;
  street: string;
  other: string;
}

interface ContactInfo {
  phone: string;
  mail: string;
}

interface ContactProps {
  config: ContactConfig;
  address: Address;
  contact: ContactInfo;
  workingDays: (string | null)[];
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
      className="absolute left-10 -top-0 px-2 text-sm font-medium text-primary dark:text-primary-dark bg-light-surface dark:bg-dark-surface"
    >
      {label}
    </label>
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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
        className={`w-full pl-10 pr-4 py-3 bg-transparent border-2 ${error
          ? 'border-red-500 dark:border-red-500'
          : 'border-primary/30 dark:border-primary-dark/30 focus:border-primary dark:focus:border-primary-dark'
          } rounded-lg transition-all outline-none text-light-text dark:text-dark-text resize-none`}
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
        className={`w-full pl-10 pr-4 py-3 bg-transparent border-2 ${error
          ? 'border-red-500 dark:border-red-500'
          : 'border-primary/30 dark:border-primary-dark/30 focus:border-primary dark:focus:border-primary-dark'
          } rounded-lg transition-all outline-none text-light-text dark:text-dark-text`}
        aria-required={required}
        aria-invalid={!!error}
      />
    )}
    {error && (
      <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
    )}
  </div>
);

const Contact: React.FC<ContactProps> = ({ config, address, contact, workingDays }) => {
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

  const getFullAddress = () => {
    return `${address.street}, ${address.other}, ${address.city}, ${address.state}`;
  };

  const formatWorkingHours = () => {
    const days = language === 'he'
      ? ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return workingDays
      .map((hours, index) => ({
        day: days[index],
        hours: hours === null
          ? (language === 'he' ? 'סגור' : 'Closed')
          : language === 'he'
            ? hours
            : hours.split('-').map(time => {
              const [h, m] = time.split(':');
              const hour = parseInt(h);
              return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
            }).join(' - ')
      }))
      .filter(schedule => schedule.hours !== 'Closed' && schedule.hours !== 'סגור');
  };

  const validateForm = () => {
    const errors = {
      name: '',
      phone: '',
      message: ''
    };

    if (formData.name.length < 2 || formData.name.length > 50) {
      errors.name = language === 'he'
        ? 'נא להזין שם בין 2 ל-50 תווים'
        : 'Please enter a name between 2 and 50 characters';
    }

    if (!formData.phone.startsWith('05')) {
      errors.phone = language === 'he'
        ? 'מספר הטלפון חייב להתחיל ב-05'
        : 'Phone number must start with 05';
    } else if (formData.phone.length !== 10) {
      errors.phone = language === 'he'
        ? 'מספר הטלפון חייב להכיל 10 ספרות'
        : 'Phone number must be 10 digits long';
    } else if (!/^\d+$/.test(formData.phone)) {
      errors.phone = language === 'he'
        ? 'מספר הטלפון חייב להכיל ספרות בלבד'
        : 'Phone number must contain only digits';
    }

    if (formData.message.trim().length < 10) {
      errors.message = language === 'he'
        ? 'ההודעה חייבת להכיל לפחות 10 תווים'
        : 'Message must be at least 10 characters long';
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
      const msg = `השאירו לך הודעה חדשה ! 

    ${formData.name + " - " + formData.phone} 
    
    ${formData.message}`;
      const res = await smsService.sendSMS(contact.phone, msg);

      if (!res) throw "";
      setIsSuccess(true);
      // Reset form after showing success message
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({ name: '', phone: '', message: '' });
      }, 3000);
    } catch (err) {
      setError(language === 'he' ? 'אירעה שגיאה בשליחת ההודעה' : 'An error occurred while sending the message');
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

  const contactInfo = [
    {
      icon: MapPin,
      title: t('about.location'),
      content: getFullAddress(),
      action: `https://maps.google.com/?q=${encodeURIComponent(getFullAddress())}`,
      isLink: true,
      color: 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
    },
    {
      icon: Phone,
      title: t('about.phone'),
      content: contact.phone,
      action: () => handleContactClick('phone', `tel:${contact.phone.replace(/[^0-9+]/g, '')}`),
      isLink: false,
      color: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
    },
    {
      icon: Mail,
      title: t('about.email'),
      content: contact.mail,
      action: `mailto:${contact.mail}`,
      isLink: true,
      color: 'bg-blue-500/10 text-blue-500 dark:text-blue-400'
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
        className="py-32 bg-gradient-to-b from-light-surface to-light-bg dark:from-dark-surface dark:to-dark-bg transition-colors duration-300 relative overflow-hidden"
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
            backgroundImage: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.2) 0%, transparent 50%)',
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
          <motion.div className="text-center mb-20" variants={itemVariants}>
            <h2
              className="text-4xl font-bold text-light-text dark:text-dark-text mb-6"
              id="contact-title"
            >
              {config.title}
            </h2>
            <div className="w-24 h-1 bg-primary dark:bg-primary-dark mx-auto mb-8" aria-hidden="true"></div>
            <p className="text-xl text-light-text/80 dark:text-dark-text/80 max-w-2xl mx-auto">
              {config.description}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <motion.div variants={containerVariants}>
              <div className="space-y-8" role="list" aria-label="Contact information">
                {contactInfo.map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start space-x-4"
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    role="listitem"
                  >
                    <div
                      className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center flex-shrink-0`}
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
                          {item.content}
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
                className="mt-12 p-6 bg-light-surface dark:bg-dark-surface rounded-3xl shadow-lg border-2 border-primary/10 dark:border-primary-dark/10"
                variants={itemVariants}
              >
                <h4 className="font-semibold text-lg mb-4 text-light-text dark:text-dark-text">
                  {language === 'he' ? 'שעות פעילות' : 'Business Hours'}
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
                className="space-y-6 bg-light-surface dark:bg-dark-surface p-8 rounded-3xl shadow-xl border-2 border-primary/10 dark:border-primary-dark/10"
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
                  className="w-full bg-primary dark:bg-primary-dark text-white dark:text-dark-surface py-4 px-6 rounded-xl transition-all relative overflow-hidden shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="flex items-center justify-center space-x-2"
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
                      <div className="w-6 h-6 border-3 border-white dark:border-dark-surface border-t-transparent rounded-full animate-spin" />
                    </motion.div>
                  )}
                </motion.button>

                <AnimatePresence>
                  {isSuccess && (
                    <motion.div
                      className="text-emerald-500 dark:text-emerald-400 text-center flex items-center justify-center space-x-2"
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
                      className="text-red-500 dark:text-red-400 text-center flex items-center justify-center space-x-2"
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
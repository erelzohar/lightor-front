import React from 'react';
import {
  Star,
  Award,
  Users,
  Sparkles,
  Hand,
  Shield,
  CheckCircle,
  Smile,
  Rocket,
  Globe,
  Calendar,
  Settings,
  Bell,
  Heart,
  MapPin,
  Phone,
  Mail,
  Clock,
  Instagram,
  Facebook
} from "lucide-react";
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { ContactModal } from '../ContactModal';
import { useContactHandler } from '../../hooks/useContactHandler';
import { AboutConfig } from '../../models/AboutConfig';
import { Social } from '../../models/Social';

interface WebsiteConfig {
  address: {
    state: string;
    city: string;
    street: string;
    other: string;
  };
  contact: {
    phone: string;
    mail: string;
  };
  social: Social;
  workingDays: (string | null)[];
}

interface AboutProps {
  config: AboutConfig;
  websiteConfig: WebsiteConfig;
}

const About: React.FC<AboutProps> = ({ config, websiteConfig }) => {
  const { t, language } = useLanguage();
  const { isModalOpen, setIsModalOpen, modalType, handleContactClick } = useContactHandler();

  const formatWorkingHours = () => {
    const days = language === 'he'
      ? ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return websiteConfig.workingDays
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

  const getFullAddress = () => {
    return `${websiteConfig.address.street}, ${websiteConfig.address.other}, ${websiteConfig.address.city}, ${websiteConfig.address.state}`;
  };

  const socialLinks = [
    websiteConfig.contact.phone && {
      icon: () => (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      onClick: () => handleContactClick('whatsapp', `https://wa.me/${websiteConfig.contact.phone.replace(/[^0-9+]/g, '')}`),
      color: 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white dark:hover:text-white'
    },
    websiteConfig.social.instagram && {
      icon: Instagram,
      href: websiteConfig.social.instagram,
      color: 'bg-[#F77EB9]/10 text-[#F77EB9] hover:bg-[#F77EB9] hover:text-white dark:hover:text-white'
    },
    websiteConfig.social.tiktok && {
      icon: () => (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      ),
      href: websiteConfig.social.tiktok,
      color: 'bg-[#000000]/5 text-black hover:bg-[#000000] hover:text-white dark:bg-[#000000]/10 dark:text-white dark:hover:bg-[#000000]'
    },
    websiteConfig.social.facebook && {
      icon: Facebook,
      href: websiteConfig.social.facebook,
      color: 'bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white dark:hover:text-white'
    },
    websiteConfig.social.x && {
      icon: () => (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      href: websiteConfig.social.x,
      color: 'bg-[#000000]/5 text-black hover:bg-[#000000] hover:text-white dark:bg-[#000000]/10 dark:text-white dark:hover:bg-[#000000]'
    },
    websiteConfig.contact.phone && {
      icon: Phone,
      onClick: () => handleContactClick('phone', `tel:${websiteConfig.contact.phone.replace(/[^0-9+]/g, '')}`),
      color: 'bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981] hover:text-white dark:hover:text-white'
    }
  ].filter(Boolean);

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
      content: websiteConfig.contact.phone,
      action: () => handleContactClick('phone', `tel:${websiteConfig.contact.phone.replace(/[^0-9+]/g, '')}`),
      isLink: false,
      color: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
    },
    {
      icon: Mail,
      title: t('about.email'),
      content: websiteConfig.contact.mail,
      action: `mailto:${websiteConfig.contact.mail}`,
      isLink: true,
      color: 'bg-blue-500/10 text-blue-500 dark:text-blue-400'
    },
    {
      icon: Clock,
      title: t('about.hours'),
      content: formatWorkingHours(),
      isLink: false,
      color: 'bg-amber-500/10 text-amber-500 dark:text-amber-400',
      isHours: true
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
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <>
      <section id="about" className="py-32 bg-gradient-to-b from-light-bg to-light-surface dark:from-dark-bg dark:to-dark-surface transition-colors duration-300">
        <motion.div
          className="container mx-auto px-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="text-center mb-20">
            <h2 className="text-4xl font-bold text-light-text dark:text-dark-text mb-6">{config.title}</h2>
            <div className="w-24 h-1 bg-primary dark:bg-primary-dark mx-auto mb-8"></div>
            <p className="text-xl text-light-text/80 dark:text-dark-text/80">{config.description}</p>
          </motion.div>

          <motion.div
            className="max-w-3xl mx-auto text-center mb-20"
            variants={itemVariants}
          >
            <p className="text-xl text-light-text dark:text-dark-text leading-relaxed mb-8">
              {config.paragraphs.intro}
            </p>
            <p className="text-lg text-light-text/80 dark:text-dark-text/80 leading-relaxed">
              {config.paragraphs.mission}
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-12 mb-20"
            variants={containerVariants}
          >
            {config.features.map((feature, index) => (
              <motion.div
                key={index}
                className="group relative h-full"
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="absolute inset-0 bg-primary/10 dark:bg-primary-dark/10 rounded-2xl transform -rotate-6 group-hover:rotate-0 transition-transform"></div>
                <div className="relative bg-light-surface dark:bg-dark-surface p-8 rounded-2xl shadow-lg h-full flex flex-col">
                  <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 dark:bg-primary-dark/10 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform">
                    {feature.icon === 'Star' && <Star className="h-8 w-8 text-primary dark:text-primary-dark" />}
                    {feature.icon === 'Award' && <Award className="h-8 w-8 text-primary dark:text-primary-dark" />}
                    {feature.icon === 'Users' && <Users className="h-8 w-8 text-primary dark:text-primary-dark" />}
                    {feature.icon === 'Shield' && <Shield className="h-8 w-8 text-primary dark:text-primary-dark" />}
                    {feature.icon === 'CheckCircle' && <CheckCircle className="h-8 w-8 text-primary dark:text-primary-dark" />}
                    {feature.icon === 'Smile' && <Smile className="h-8 w-8 text-primary dark:text-primary-dark" />}
                    {feature.icon === 'Rocket' && <Rocket className="h-8 w-8 text-primary dark:text-primary-dark" />}
                    {feature.icon === 'Globe' && <Globe className="h-8 w-8 text-primary dark:text-primary-dark" />}
                    {feature.icon === 'Calendar' && <Calendar className="h-8 w-8 text-primary dark:text-primary-dark" />}
                    {feature.icon === 'Settings' && <Settings className="h-8 w-8 text-primary dark:text-primary-dark" />}
                    {feature.icon === 'Bell' && <Bell className="h-8 w-8 text-primary dark:text-primary-dark" />}
                    {feature.icon === 'Heart' && <Heart className="h-8 w-8 text-primary dark:text-primary-dark" />}
                    {feature.icon === 'Sparkles' && <Sparkles className="h-8 w-8 text-primary dark:text-primary-dark" />}
                    {feature.icon === 'Hand' && <Hand className="h-8 w-8 text-primary dark:text-primary-dark" />}
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-light-text dark:text-dark-text text-center">{feature.title}</h3>
                  <p className="text-light-text/80 dark:text-dark-text/80 text-center flex-grow">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="relative"
            variants={itemVariants}
          >
            <div className="relative bg-light-surface dark:bg-dark-surface rounded-3xl shadow-2xl p-12 backdrop-blur-lg">
              <h3 className="text-3xl font-bold text-center mb-12 text-light-text dark:text-dark-text">
                {t('about.visit')}
                <div className="w-20 h-1 bg-primary dark:bg-primary-dark mx-auto mt-4"></div>
              </h3>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {contactInfo.map((item, index) => (
                  <motion.div
                    key={index}
                    className="h-full"
                    variants={itemVariants}
                  >
                    <motion.div
                      className="h-full p-6 rounded-2xl bg-light-surface dark:bg-dark-surface border-2 border-primary/10 dark:border-primary-dark/10 shadow-lg flex flex-col items-center text-center"
                      whileHover={{
                        y: -5,
                        transition: { duration: 0.2 }
                      }}
                    >
                      <motion.div
                        className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center mb-4`}
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <item.icon className="h-6 w-6" />
                      </motion.div>
                      <h4 className="font-semibold mb-2 text-light-text dark:text-dark-text">{item.title}</h4>
                      <div className="flex-grow flex items-center justify-center">
                        {item.isHours ? (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-light-text/80 dark:text-dark-text/80">
                            {item.content.map((schedule: { day: string; hours: string }, idx: number) => (
                              <div key={idx} className="flex flex-col">
                                <div className="font-medium">{schedule.day}</div>
                                <div>{schedule.hours}</div>
                              </div>
                            ))}
                          </div>
                        ) : item.isLink ? (
                          <a
                            href={item.action as string}
                            className="text-light-text/80 dark:text-dark-text/80 hover:text-primary dark:hover:text-primary-dark transition-colors"
                            target={item.icon === MapPin ? "_blank" : undefined}
                            rel={item.icon === MapPin ? "noopener noreferrer" : undefined}
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
                  </motion.div>
                ))}
              </div>

              {socialLinks.length > 0 && (
                <div className="mt-12 flex flex-wrap justify-center gap-4">
                  {socialLinks.map((social, index) => (
                    <motion.button
                      key={index}
                      onClick={social.onClick || (() => window.open(social.href, '_blank'))}
                      className={`p-3 rounded-xl transition-colors ${social.color}`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {typeof social.icon === 'function' ?
                        <social.icon /> :
                        <social.icon className="h-6 w-6" />
                      }
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </section>

      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contactLink={modalType === 'whatsapp'
          ? `https://wa.me/${websiteConfig.contact.phone.replace(/[^0-9+]/g, '')}`
          : `tel:${websiteConfig.contact.phone.replace(/[^0-9+]/g, '')}`}
        type={modalType}
      />
    </>
  );
};

export default About;
import React, { useState } from 'react';
import { Instagram, Facebook } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { ContactModal } from '../ContactModal';
import { useContactHandler } from '../../hooks/useContactHandler';
import { LegalModal } from '../LegalModal';
import { AppointmentType } from '../../models/AppointmentType';
import { Social } from '../../models/Social';
import globals from '../../services/globals';

interface WebsiteConfig {
  about?: { visible?: boolean };
  portfolio?: { visible?: boolean };
  contact?: { visible?: boolean; phone?: string };
}

interface FooterProps {
  config: {
    description: string;
  };
  social: Social;
  businessName: string;
  logoImageName: string;
  appointmentsType: AppointmentType[];
  websiteConfig: WebsiteConfig;
}

const Footer: React.FC<FooterProps> = ({ config, social, businessName, logoImageName, appointmentsType, websiteConfig }) => {
  const { t, language } = useLanguage();
  const { isModalOpen, setIsModalOpen, modalType, handleContactClick } = useContactHandler();
  const [legalModal, setLegalModal] = useState<{
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
  }>({
    isOpen: false,
    title: '',
    content: null
  });

  const openLegalModal = (type: 'privacy' | 'terms' | 'security') => {
    const content = {
      privacy: {
        title: t('footer.policy.privacy'),
        content: (
          <div>
            {language === 'he' ? (
              <>
                <p>אנו במערכת Lightor מכבדים את פרטיות המשתמשים ומחויבים להגן על המידע האישי שלהם.</p><br />
                <h4>איסוף מידע</h4>
                <p>בעת קביעת תור אנו אוספים מידע בסיסי כמו שם מלא, מספר טלפון ולעיתים גם כתובת דוא״ל או פרטי התקשרות נוספים.</p><br />
                <p>המידע נאסף ישירות מהמשתמש ואינו מועבר לצדדים שלישיים ללא הסכמה מראש.</p><br />
                <h4>שימוש במידע</h4>
                <p>המידע האישי ישמש אך ורק למטרות הקשורות לקביעת תורים, תזכורות, עדכונים, ומתן שירותים הקשורים לשירותים שנקבעו.</p><br />
                <p>אין להשתמש במידע לצרכים מסחריים אחרים מבלי לקבל את הסכמתך.</p><br />
                <h4>העברת מידע לצדדים שלישיים</h4>
                <p>אנו לא נמסור את המידע האישי לצדדים שלישיים אלא אם נידרש לכך על פי חוק או צו בית משפט.</p><br />
                <h4>כתב ויתור</h4>
                <p>השימוש באתר הינו באחריות המשתמש בלבד. {'Lightor'} לא תישא באחריות לכל נזק ישיר או עקיף, כולל אובדן מידע, הנובע משימוש באתר או ממידע שנמסר באמצעותו.</p><br />
                <p>האתר עשוי להכיל קישורים לאתרים חיצוניים – אין לנו שליטה עליהם ואנו לא אחראים לתוכנם או להתנהלותם.</p><br />
              </>
            ) : (
              <></>
            )}
          </div>
        )
      },
      terms: {
        title: t('footer.policy.terms'),
        content: (
          <div>
            {language === 'he' ? (
              <>
                <p>השימוש במערכת {'Lightor'} מהווה הסכמה מלאה מצד המשתמש לתנאים המפורטים להלן:</p><br />
                <h4>שימוש במערכת</h4>
                <p>השירות ניתן כמות שהוא ("As Is"). איננו מתחייבים לזמינות מלאה או לתפקוד ללא תקלות בכל עת.</p><br />
                <p>המשתמש אחראי לוודא כי המידע שהוא מזין נכון ועדכני. {'Lightor'} אינה אחראית להשלכות של מידע שגוי.</p><br />
                <p>בעת השימוש במערכת הנך מאשר לקבל דיוור\הודעות מערכת\תזכורות באמצעי המדיה השונים.</p><br />
                <h4>ביטולים ואי-הגעה</h4>
                <p>משתמשים מתבקשים לבטל תורים לפי תנאי המפעיל. אי הגעה לתור עלולה להוביל לחיוב או הגבלה בשימוש עתידי.</p><br />
                <h4>ויתור מאחריות</h4>
                <p>{'Lightor'} לא תישא באחריות לכל נזק, ישיר או עקיף, שייגרם עקב שימוש או חוסר יכולת להשתמש במערכת, לרבות תקלות טכניות או זמינות.</p><br />
                <p>כל תוכן באתר או במערכת לרבות טקסטים, תמונות או מידע אחר, נועדו להמחשה בלבד ואינם מהווים ייעוץ מקצועי או מסמך משפטי מחייב.</p><br />
              </>
            ) : (
              <></>
            )}
          </div>
        )
      },
      security: {
        title: t('footer.policy.security'),
        content: (
          <div>
            {language === 'he' ? (
              <>
                <p>{'Lightor'} מחויבת לשמור על אבטחת המידע של משתמשיה באמצעות טכנולוגיות אבטחה מתקדמות ופרוטוקולים מקובלים.</p><br />
                <h4>הצפנה ואחסון</h4>
                <p>המידע מועבר לשרתים שלנו באופן מוצפן ונשמר בסביבה מאובטחת ומוגנת.</p><br />
                <h4>גישה למידע</h4>
                <p>הגישה למידע האישי מוגבלת אך ורק לצוות המורשה שזקוק לכך לצורך תפעול השירות.</p><br />
                <h4>אחריות המשתמש</h4>
                <p>על המשתמש לוודא שהוא שומר על סיסמאותיו ואמצעי ההזדהות שלו בסוד. {'Lightor'} לא תישא באחריות לנזקים הנובעים משימוש לא מורשה בפרטי ההזדהות של המשתמש.</p><br />
                <h4>ויתור מאחריות</h4>
                <p>למרות מאמצינו, לא ניתן להבטיח חסינות מוחלטת מפריצות או כשלים. השימוש באתר ובמערכת נעשה באחריות המשתמש בלבד.</p><br />
              </>
            ) : (
              <></>
            )}
          </div>
        )
      }
    };

    setLegalModal({
      isOpen: true,
      title: content[type].title,
      content: content[type].content
    });
  };

  const menuItems = [
    { href: "#about", label: t('nav.about'), visible: websiteConfig?.about?.visible },
    { href: "#portfolio", label: t('nav.portfolio'), visible: websiteConfig?.portfolio?.visible },
    { href: "#schedule", label: t('nav.schedule'), visible: true },
    { href: "#contact", label: t('nav.contact'), visible: websiteConfig?.contact?.visible }
  ].filter(item => item.visible === undefined || item.visible);

  const socialLinks = [
    social.instagram && {
      icon: Instagram,
      href: social.instagram,
      color: 'bg-[#F77EB9]/10 text-[#F77EB9] hover:bg-[#F77EB9] hover:text-white dark:hover:text-white',
      label: t('footer.social.follow.instagram')
    },
    social.tiktok && {
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
      href: social.tiktok,
      color: 'bg-[#000000]/5 text-white hover:bg-[#000000] hover:text-white dark:bg-[#000000]/10 dark:text-white dark:hover:bg-[#000000]',
      label: t('footer.social.follow.tiktok')
    },
    social.facebook && {
      icon: Facebook,
      href: social.facebook,
      color: 'bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white dark:hover:text-white',
      label: t('footer.social.follow.facebook')
    },
    social.x && {
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
      href: social.x,
      color: 'bg-[#000000]/10 text-white hover:bg-[#000000] hover:text-white dark:bg-[#000000]/10 dark:text-white dark:hover:bg-[#000000]',
      label: t('footer.social.follow.x')
    }
  ].filter(Boolean);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      <footer className="bg-dark-surface text-dark-text pt-20 pb-10">
        <motion.div
          className="container mx-auto px-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            {/* Logo and Description */}
            <motion.div variants={itemVariants} className="text-center md:text-right">
              <div className="flex items-center justify-center md:justify-start space-x-2 mb-6">
                <img
                  src={globals.imagesUrl + logoImageName}
                  alt="Logo"
                  className="h-10 w-10 rounded-full object-cover"
                />
                <span className="text-2xl font-bold">{businessName}</span>
              </div>
              <p className="text-dark-text/80 leading-relaxed">
                {config.description}
              </p>
            </motion.div>

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <motion.div variants={itemVariants} className="text-center md:text-right">
                <h3
                  className="text-lg font-semibold mb-6"
                  id="footer-social"
                >
                  {t('footer.follow')}
                </h3>
                <div
                  className="flex justify-center md:justify-start space-x-4"
                  role="list"
                  aria-labelledby="footer-social"
                >
                  {socialLinks.map((social, index) => (
                    <motion.button
                      key={index}
                      onClick={() => window.open(social.href, '_blank')}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${social.color}`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.9 }}
                      role="listitem"
                      aria-label={social.label}
                    >
                      {typeof social.icon === 'function' ?
                        <social.icon /> :
                        <social.icon className="h-5 w-5" aria-hidden="true" />
                      }
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Quick Links and Services */}
            <motion.div variants={itemVariants} className="text-center md:text-right">
              <div className="grid grid-cols-2 gap-8">
                {/* Quick Links */}
                <div>
                  <h3
                    className="text-lg font-semibold mb-6"
                    id="footer-links"
                  >
                    {t('footer.links')}
                  </h3>
                  <nav aria-labelledby="footer-links">
                    <ul className="space-y-4" role="list">
                      <motion.li whileHover={{ x: 5 }} role="listitem">
                        <button
                          onClick={handleScrollToTop}
                          className="text-dark-text/80 hover:text-primary-dark transition-colors"
                        >
                          {t('nav.home')}
                        </button>
                      </motion.li>
                      {menuItems.map((item, index) => (
                        <motion.li key={index} whileHover={{ x: 5 }} role="listitem">
                          <a
                            href={item.href}
                            className="text-dark-text/80 hover:text-primary-dark transition-colors"
                          >
                            {item.label}
                          </a>
                        </motion.li>
                      ))}
                    </ul>
                  </nav>
                </div>

                {/* Services */}
                <div>
                  <h3
                    className="text-lg font-semibold mb-6"
                    id="footer-services"
                  >
                    {t('footer.services')}
                  </h3>
                  <ul className="space-y-4" role="list" aria-labelledby="footer-services">
                    {appointmentsType.map((app, index) => (
                      <motion.li
                        key={index}
                        className="text-dark-text/80"
                        whileHover={{ x: 5 }}
                        role="listitem"
                      >
                        {app.name}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            className="border-t border-dark-bg pt-8 text-center text-dark-text/60 space-y-4"
            variants={itemVariants}
          >
            <p>
              &copy; {new Date().getFullYear()} {businessName}. {t('footer.rights')}
            </p>
            <div className="flex justify-center items-center gap-4 text-sm">
              <button
                onClick={() => openLegalModal('privacy')}
                className="hover:text-primary-dark transition-colors"
              >
                {t('footer.policy.privacy')}
              </button>
              <span>•</span>
              <button
                onClick={() => openLegalModal('terms')}
                className="hover:text-primary-dark transition-colors"
              >
                {t('footer.policy.terms')}
              </button>
              <span>•</span>
              <button
                onClick={() => openLegalModal('security')}
                className="hover:text-primary-dark transition-colors"
              >
                {t('footer.policy.security')}
              </button>
            </div>
            <motion.a
              href="https://instagram.com/ezwebs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-primary-dark hover:text-primary transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('footer.business.link')}
            </motion.a>
          </motion.div>
        </motion.div>
      </footer>

      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contactLink={modalType === 'whatsapp'
          ? `https://wa.me/${websiteConfig?.contact?.phone?.replace(/[^0-9+]/g, '') || ''}`
          : `tel:${websiteConfig?.contact?.phone?.replace(/[^0-9+]/g, '') || ''}`}
        type={modalType}
      />

      <LegalModal
        isOpen={legalModal.isOpen}
        onClose={() => setLegalModal(prev => ({ ...prev, isOpen: false }))}
        title={legalModal.title}
        content={legalModal.content}
      />
    </>
  );
};

export default Footer;
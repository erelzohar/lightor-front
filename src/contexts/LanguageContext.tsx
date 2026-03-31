import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'he';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.portfolio': 'Latest',
    'nav.schedule': 'Schedule',
    'nav.contact': 'Contact',

    //intro popup
    'intro.title': 'System message',
    'intro.button': 'Close',
    // Hero
    'hero.book': 'Book Appointment',
    'hero.contact': 'Contact Us',

    // About
    'about.title': 'About StyleTime Studio',
    'about.location': 'Location',
    'about.phone': 'Phone',
    'about.email': 'Email',
    'about.hours': 'Work Hours',
    'about.visit': 'Visit Us',

    // Portfolio
    'portfolio.title': 'Our Latest',
    'portfolio.view.slideshow': 'Slideshow',
    'portfolio.view.grid': 'Grid',

    // Schedule
    'schedule.title': 'Schedule Your Visit',
    'schedule.select.date': 'Select Date',
    'schedule.select.time': 'Select Time',
    'schedule.available.times': 'Available Times for',
    'schedule.book': 'Book Appointment',
    'schedule.success': 'Appointment booked successfully!',
    'schedule.update.success': 'Appointment updated successfully!',
    'schedule.error': 'Something went wrong...',
    'schedule.coflictError': 'The appointment has been taken please try another one',
    'schedule.form.name': 'Full Name',
    'schedule.form.phone': 'Phone Number',
    'schedule.form.verification': 'Verification Code',
    'schedule.form.verification.message': 'A verification code has been sent to your phone',
    'schedule.form.send.code': 'Send Verification Code',
    'schedule.form.verify': 'Verify and Book',
    'schedule.form.resend.code': 'Resend Code',
    'schedule.form.resend.wait': 'Resend in',
    'schedule.form.resend.timer': 'seconds',
    'schedule.form.helper': "By clicking 'Book Appointment', a verification code will be sent to the phone number provided.",
    'schedule.legend.available': 'Available',
    'schedule.legend.limited': 'Limited Slots',
    'schedule.legend.vacation': 'On vacation',
    'schedule.legend.closed': 'Fully Booked / Closed',
    'schedule.select.type': 'Select haircut type',
    'schedule.original.appointment': 'Your Appointment',
    'schedule.error.sendOtp': 'Error sending verification code',
    'schedule.error.invalidOtp': 'Invalid verification code',
    'schedule.validation.name': 'Please enter a name between 2 and 50 characters',
    'schedule.validation.phone.start': 'Phone number must start with 05',
    'schedule.validation.phone.length': 'Phone number must be 10 digits long',
    'schedule.validation.phone.digits': 'Phone number must contain only digits',
    'schedule.validation.otp.length': 'Verification code must be 6 digits long',
    'schedule.validation.otp.digits': 'Verification code must contain only digits',
    'schedule.channel.sms': 'Send code & updates via SMS',
    'schedule.channel.whatsapp': 'Send code & updates via WhatsApp',
    'common.back': 'Back',
    'common.minutes': 'minutes',
    'day.0': 'Sunday',
    'day.1': 'Monday',
    'day.2': 'Tuesday',
    'day.3': 'Wednesday',
    'day.4': 'Thursday',
    'day.5': 'Friday',
    'day.6': 'Saturday',
    'schedule.confirmation.user': 'Hi {{name}}, your appointment at {{businessName}} has been scheduled for {{day}} {{date}} at {{time}}. Cancellation link {{timeUntilLabel}}:\n {{link}}',
    'schedule.confirmation.user.update': 'Hi {{name}}, your appointment at {{businessName}} has been updated to {{day}} {{date}} at {{time}}. Cancellation link {{timeUntilLabel}}:\n {{link}}',
    'schedule.confirmation.business': "New appointment scheduled!\nName: {{name}}\nPhone: {{phone}}\nDate: {{day}} {{date}} at {{time}}\nLightor",
    'common.until': 'until {{time}}',
    'common.before': 'before the appointment',
    'time.unlimited': 'Unlimited',
    'time.half.hour': 'Half an hour',
    'time.hour': 'An hour',
    'time.2hours': '2 hours',
    'time.3hours': '3 hours',
    'time.4hours': '4 hours',
    'time.6hours': '6 hours',
    'time.12hours': '12 hours',
    'time.24hours': '24 hours',
    'time.48hours': '48 hours',
    'time.72hours': '72 hours',
    'time.week': 'A week',
    'time.2weeks': 'Two weeks',

    // Contact
    'contact.title': 'Get in Touch',
    'contact.form.name': 'Name',
    'contact.form.phone': 'Phone',
    'contact.form.message': 'Message',
    'contact.form.send': 'Send Message',
    'contact.form.success': 'Message sent successfully!',

    // Footer
    'footer.links': 'Quick Links',
    'footer.services': 'Services',
    'footer.follow': 'Follow Us',
    'footer.rights': 'All rights reserved.',
    'footer.business.link': 'Want this for your business? Click here',

    // Manage Appointment
    'manage.update.title': 'Update appointment',
    'manage.update.success.title': 'Appointment Updated',
    'manage.new.time.title': 'Choose a new time for your appointment',
    'manage.manage.title': 'Manage Appointment',
    'manage.message.cancellable': 'You can cancel or update this appointment',
    'manage.message.not.cancellable': 'Cannot cancel or update appointment less than ',
    'manage.message.time.until': 'Only {{time}} until the appointment',
    'manage.label.date': 'Date',
    'manage.label.time': 'Time',
    'manage.label.name': 'Name',
    'manage.label.phone': 'Phone',
    'manage.label.type': 'Service Type',
    'manage.button.back': 'Go Back',
    'manage.button.cancel': 'Cancel',
    'manage.modal.confirm.title': 'Confirm Cancellation',
    'manage.modal.confirm.message': 'Are you sure you want to cancel this appointment?',
    'manage.modal.button.confirm': 'Confirm Cancel',
    'manage.success.title': 'Appointment Cancelled',

    // Contact Components
    'contact.button.options': 'Contact options',
    'contact.option.call': 'Call us',
    'contact.option.whatsapp': 'Send WhatsApp',
    'contact.option.report': 'Report a Problem',
    'contact.modal.close': 'Close modal',
    'contact.modal.scan.title': 'Scan to Open WhatsApp',
    'contact.modal.call.title': 'Call Us',
    'contact.modal.qr.label': 'WhatsApp QR Code',
    'contact.modal.scan.message': 'Scan the QR code with your phone camera to open WhatsApp chat',
    'contact.modal.or.whatsapp': 'Or click the button to open WhatsApp directly',
    'contact.modal.or.call': 'Or click the button to call directly',
    'contact.modal.button.whatsapp': 'Open WhatsApp in new window',
    'contact.modal.button.call': 'Call now',
    'contact.modal.link.text.whatsapp': 'Open WhatsApp',
    'contact.modal.link.text.call': 'Call now',

    // Not Found Page
    'notfound.title': 'Page Not Found',
    'notfound.message': 'The page you are looking for does not exist or has been removed. Try refreshing or return to homepage.',
    'notfound.button.home': 'Back to Home',
    'notfound.button.refresh': 'Refresh Page',

    // Footer Policies & Socials
    'footer.social.follow.instagram': 'Follow us on Instagram',
    'footer.social.follow.tiktok': 'Follow us on TikTok',
    'footer.social.follow.facebook': 'Follow us on Facebook',
    'footer.social.follow.x': 'Follow us on X',
    'footer.policy.privacy': 'Privacy Policy',
    'footer.policy.terms': 'Terms of Use',
    'footer.policy.security': 'Security Policy',

  },
  he: {
    // Navigation
    'nav.home': 'בית',
    'nav.about': 'אודות',
    'nav.portfolio': 'לאחרונה',
    'nav.schedule': 'קביעת תור',
    'nav.contact': 'צור קשר',

    //intro popup
    'intro.title': 'הודעת מערכת',
    'intro.button': 'סגור',

    // Hero
    'hero.book': 'קביעת תור',
    'hero.contact': 'צור קשר',

    // About
    'about.title': 'אודות סטייל טיים סטודיו',
    'about.location': 'מיקום',
    'about.phone': 'טלפון',
    'about.email': 'אימייל',
    'about.hours': 'שעות פעילות',
    'about.visit': 'בקרו אותנו',

    // Portfolio
    'portfolio.view.slideshow': 'מצגת',
    'portfolio.view.grid': 'רשת',

    // Schedule
    'schedule.title': 'קבע את התור שלך',
    'schedule.select.date': 'בחר תאריך',
    'schedule.select.time': 'בחר שעה',
    'schedule.available.times': 'שעות זמינות ל-',
    'schedule.book': 'קבע תור',
    'schedule.error': 'משהו השתבש...',
    'schedule.conflictError': 'התור נתפס אנא נסה תור אחר',
    'schedule.success': 'התור נקבע בהצלחה!',
    'schedule.form.name': 'שם מלא',
    'schedule.form.phone': 'מספר טלפון',
    'schedule.form.verification': 'קוד אימות',
    'schedule.form.verification.message': 'קוד אימות נשלח למספר הטלפון שלך',
    // 'schedule.form.send.code': 'שלח קוד אימות',
    'schedule.form.send.code': 'קבע תור',
    'schedule.form.verify': 'אמת וקבע תור',
    'schedule.form.resend.code': 'שלח קוד שוב',
    'schedule.form.resend.wait': 'שלח שוב בעוד',
    'schedule.form.resend.timer': 'שניות',
    'schedule.form.helper': "בלחיצה על 'קבע תור' יישלח קוד אימות לטלפון שבחרת",
    'schedule.legend.available': 'זמין',
    'schedule.legend.limited': 'זמינות מוגבלת',
    'schedule.legend.vacation': 'בחופשה',
    'schedule.legend.closed': 'תפוסה מלאה / סגור',
    'schedule.select.type': 'בחר סוג תספורת',
    'schedule.original.appointment': 'התור שלך',
    'schedule.error.sendOtp': 'שגיאה בשליחת קוד האימות',
    'schedule.error.invalidOtp': 'קוד אימות שגוי',
    'schedule.validation.name': 'נא להזין שם בין 2 ל-50 תווים',
    'schedule.validation.phone.start': 'מספר הטלפון חייב להתחיל ב-05',
    'schedule.validation.phone.length': 'מספר הטלפון חייב להכיל 10 ספרות',
    'schedule.validation.phone.digits': 'מספר הטלפון חייב להכיל ספרות בלבד',
    'schedule.validation.otp.length': 'קוד האימות חייב להכיל 6 ספרות',
    'schedule.validation.otp.digits': 'קוד האימות חייב להכיל ספרות בלבד',
    'schedule.channel.sms': 'שלח קוד ועדכונים ב-SMS',
    'schedule.channel.whatsapp': 'שלח קוד ועדכונים בוואטסאפ',
    'common.back': 'חזור',
    'common.minutes': 'דקות',
    'day.0': 'ראשון',
    'day.1': 'שני',
    'day.2': 'שלישי',
    'day.3': 'רביעי',
    'day.4': 'חמישי',
    'day.5': 'שישי',
    'day.6': 'שבת',
    'schedule.confirmation.user': 'היי {{name}}, נקבע לך תור ל{{businessName}}, יום {{day}} ה-{{date}} בשעה {{time}}. לינק לביטול {{timeUntilLabel}}:\n {{link}}',
    'schedule.confirmation.user.update': 'היי {{name}}, התור שלך ב-{{businessName}} עודכן ליום {{day}} ה-{{date}} בשעה {{time}}. לינק לניהול התור {{timeUntilLabel}}:\n {{link}}',
    'schedule.confirmation.business': "נקבע אצלך תור חדש !\nשם: {{name}}\nטלפון: {{phone}}\nתאריך: יום {{day}} ה-{{date}} בשעה {{time}}\nLightor",
    'common.until': 'עד {{time}}',
    'common.before': 'לפני התור',
    'time.unlimited': 'ללא הגבלה',
    'time.half.hour': 'חצי שעה',
    'time.hour': 'שעה',
    'time.2hours': 'שעתיים',
    'time.3hours': '3 שעות',
    'time.4hours': '4 שעות',
    'time.6hours': '6 שעות',
    'time.12hours': '12 שעות',
    'time.24hours': '24 שעות',
    'time.48hours': '48 שעות',
    'time.72hours': '72 שעות',
    'time.week': 'שבוע',
    'time.2weeks': 'שבועיים',

    // Contact
    'contact.title': 'צור קשר',
    'contact.form.name': 'שם',
    'contact.form.phone': 'טלפון',
    'contact.form.message': 'הודעה',
    'contact.form.send': 'שלח הודעה',
    'contact.form.success': 'ההודעה נשלחה בהצלחה!',

    // Footer
    'footer.links': 'קישורים מהירים',
    'footer.services': 'שירותים',
    'footer.follow': 'עקבו אחרינו',
    'footer.rights': 'כל הזכויות שמורות.',
    'footer.business.link': 'רוצה כזה לעסק שלך? לחץ כאן',

    // Manage Appointment
    'manage.update.title': 'עדכון תור',
    'manage.update.success.title': 'התור עודכן בהצלחה',
    'manage.new.time.title': 'בחר מועד חדש לתור',
    'manage.manage.title': 'ניהול תור',
    'manage.message.cancellable': 'באפשרותך לבטל או לעדכן את התור',
    'manage.message.not.cancellable': 'לא ניתן לבטל או לעדכן תור פחות מ-',
    'manage.message.time.until': 'נותרו {{time}} עד התור',
    'manage.label.date': 'תאריך',
    'manage.label.time': 'שעה',
    'manage.label.name': 'שם',
    'manage.label.phone': 'טלפון',
    'manage.label.type': 'סוג שירות',
    'manage.button.back': 'חזור',
    'manage.button.cancel': 'ביטול תור',
    'manage.modal.confirm.title': 'אישור ביטול',
    'manage.modal.confirm.message': 'האם אתה בטוח שברצונך לבטל את התור?',
    'manage.modal.button.confirm': 'כן, בטל את התור',
    'manage.success.title': 'התור בוטל בהצלחה',

    // Contact Components
    'contact.button.options': 'אפשרויות יצירת קשר',
    'contact.option.call': 'התקשר אלינו',
    'contact.option.whatsapp': 'שלח הודעת WhatsApp',
    'contact.option.report': 'דווח על בעיה',
    'contact.modal.close': 'סגור חלון',
    'contact.modal.scan.title': 'סרוק ועבור לוואטסאפ',
    'contact.modal.call.title': 'התקשר אלינו',
    'contact.modal.qr.label': 'קוד QR לוואטסאפ',
    'contact.modal.scan.message': 'סרוק את הקוד באמצעות המצלמה בטלפון שלך כדי לפתוח את השיחה בוואטסאפ',
    'contact.modal.or.whatsapp': 'או לחץ על הכפתור למעבר ישיר לוואטסאפ',
    'contact.modal.or.call': 'או לחץ על הכפתור להתקשרות',
    'contact.modal.button.whatsapp': 'פתח בוואטסאפ בחלון חדש',
    'contact.modal.button.call': 'התקשר עכשיו',
    'contact.modal.link.text.whatsapp': 'פתח בוואטסאפ',
    'contact.modal.link.text.call': 'התקשר עכשיו',

    // Not Found Page
    'notfound.title': 'העמוד לא נמצא',
    'notfound.message': 'העמוד שחיפשת לא קיים או שהוסר. נסה לרענן את העמוד או לחזור לדף הבית.',
    'notfound.button.home': 'חזור לדף הבית',
    'notfound.button.refresh': 'רענן עמוד',

    // Footer Policies & Socials
    'footer.social.follow.instagram': 'עקוב אחרינו באינסטגרם',
    'footer.social.follow.tiktok': 'עקוב אחרינו בטיקטוק',
    'footer.social.follow.facebook': 'עקוב אחרינו בפייסבוק',
    'footer.social.follow.x': 'עקוב אחרינו ב-X',
    'footer.policy.privacy': 'מדיניות פרטיות',
    'footer.policy.terms': 'תנאי שימוש',
    'footer.policy.security': 'מדיניות אבטחה',

  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLanguage?: Language;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children, defaultLanguage = 'he' }) => {
  const [language, setLanguage] = useState<Language>(defaultLanguage);

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[language][key as keyof typeof translations[typeof language]] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{{${k}}}`, String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <div dir={language === 'he' ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
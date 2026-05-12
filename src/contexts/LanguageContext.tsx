import React, { createContext, useContext, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export type Language = 'en' | 'he' | 'ar' | 'fr' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLanguage?: Language;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children, defaultLanguage = 'he' }) => {
  const { t, i18n } = useTranslation();

  // Normalize the language code (e.g., "he-IL" -> "he")
  const currentLang = (i18n.language?.split('-')[0] || defaultLanguage) as Language;

  const setLanguage = useCallback((lang: Language) => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [i18n]);

  // Determine direction based on normalized language
  const isRTL = currentLang === 'he' || currentLang === 'ar';

  return (
    <LanguageContext.Provider value={{ language: currentLang, setLanguage, t }}>
      <div dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'rtl-grid' : 'ltr-grid'}>
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
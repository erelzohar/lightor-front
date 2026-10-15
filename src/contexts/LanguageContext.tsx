import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type Language = 'en' | 'he' | 'ar' | 'fr' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /**
   * LT-346: the language the site's own text is written in (the owner's
   * default). <html lang> names it, not the visitor's menu language — a
   * visitor who switches the buttons to English still reads Hebrew content,
   * and a screen reader must pronounce it as Hebrew (WCAG 3.1.1).
   */
  setContentLanguage: (lang: Language | null) => void;
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

  const [contentLanguage, setContentLanguage] = useState<Language | null>(null);

  const setLanguage = useCallback((lang: Language) => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [i18n]);

  // Determine direction based on normalized language
  const isRTL = currentLang === 'he' || currentLang === 'ar';

  // Keep <html lang/dir> in sync with the active language. index.html ships a
  // static lang="he" dir="rtl", which used to stick forever — so the
  // [dir="rtl"] font override in index.css applied to EVERY site in EVERY
  // language, silently overriding the configured font tokens (LT-039).
  useEffect(() => {
    document.documentElement.lang = contentLanguage ?? currentLang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [currentLang, isRTL, contentLanguage]);

  return (
    <LanguageContext.Provider value={{ language: currentLang, setLanguage, t, setContentLanguage }}>
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
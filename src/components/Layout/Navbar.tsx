import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import LanguageSwitcher from '../LanguageSwitcher';
import globals from '../../services/globals';
import ImagesService from '../../services/ImagesService';
import { handleSquareImageError } from '../../utils/imageFallback';
import { useIsDarkMode } from '../../hooks/useIsDarkMode';
import { navLinksFromBlocks } from '../../services/navLinks';
import { Calendar } from 'lucide-react';

interface WebsiteConfig {
  logoImageName: string;
  businessName: string;
  components: {
    navbar: {
      visible: boolean;
      darkMode: boolean;
      languageSwitcher: boolean;
    };
    about: { visible: boolean };
    portfolio: { visible: boolean };
    contact: { visible: boolean };
  };
  design?: {
    navbarStyle?: 'floating' | 'solid' | 'transparent' | 'minimal' | 'centered' | 'pill' | 'split';
    borderRadius?: string;
  };
  /** LT-137: a composed page — links come from these, not the section flags. */
  blocks?: { type: string; id: string }[];
}

interface NavbarProps {
  websiteConfig: WebsiteConfig;
  isPreview?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ websiteConfig, isPreview }) => {
  const [isOpen, setIsOpen] = useState(false);
  // Derived from the `dark` class, never from localStorage: the design's
  // defaultTheme (and the preview) set that class without touching storage.
  const darkMode = useIsDarkMode();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const { t } = useLanguage();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Set isScrolled based on scroll position
      setIsScrolled(currentScrollY > 20);

      // Only hide navbar when not at the top and scrolling down
      if (currentScrollY > lastScrollY.current && currentScrollY > 20) {
        // Scrolling down and not at top
        setIsVisible(false);
      } else {
        // Scrolling up or at top
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen]);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const href = e.currentTarget.getAttribute('href');
    if (href) {
      const targetElement = document.querySelector(href);
      if (targetElement) {
        const navbarHeight = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        setIsOpen(false);
      }
    }
  };

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    // No local state to set — useIsDarkMode picks the class change up.
    document.documentElement.classList.toggle('dark', newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
  };

  const { language } = useLanguage();
  const menuItems = websiteConfig.blocks?.length
    ? navLinksFromBlocks(websiteConfig.blocks).map((l) => ({
      href: l.href,
      label: t(l.key, { defaultValue: language === 'he' ? l.fallbackHe : l.fallbackEn }),
      visible: true,
    }))
    : [
      { href: "#about", label: t('nav.about'), visible: websiteConfig.components.about.visible },
      { href: "#portfolio", label: t('nav.portfolio'), visible: websiteConfig.components.portfolio.visible },
      { href: "#schedule", label: t('nav.schedule'), visible: true },
      { href: "#contact", label: t('nav.contact'), visible: websiteConfig.components.contact.visible }
    ].filter(item => item.visible === undefined || item.visible);

  const { visible, darkMode: showDarkMode, languageSwitcher } = websiteConfig.components.navbar;
  const navbarStyle = websiteConfig.design?.navbarStyle ?? 'floating';

  if (!visible) return null;

  // LT-137 variants — each is its own composition, not a class swap on the
  // legacy bar. The legacy three below are untouched.
  const bookLabel = t('hero.book');
  const themeButton = (
    showDarkMode && (
      <button
        onClick={toggleDarkMode}
        className="p-2 rounded-full transition-colors bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20"
        aria-label={t('common.toggle_dark_mode', { defaultValue: 'Toggle dark mode' })}
      >
        {!darkMode ? <Moon className="h-5 w-5 text-light-text dark:text-dark-text" /> : <Sun className="h-5 w-5 text-light-text dark:text-dark-text" />}
      </button>
    )
  );
  const logo = (cls = 'h-12 w-12') => (
    <button onClick={handleScrollToTop} className="flex items-center gap-2 min-w-0" aria-label={t('nav.home')}>
      <img src={ImagesService.getInstance().getImage(websiteConfig.logoImageName)} onError={handleSquareImageError} alt="Logo" className={`${cls} rounded-full object-cover flex-shrink-0`} />
      <span className="business-name font-bold text-light-text dark:text-dark-text text-lg sm:text-xl whitespace-nowrap">{websiteConfig.businessName}</span>
    </button>
  );
  const bookButton = (
    <a href="#schedule" onClick={handleLinkClick} className="inline-flex items-center gap-2 bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark font-bold px-5 py-2.5 rounded-design text-sm hover:opacity-90 transition-opacity whitespace-nowrap">
      <Calendar className="h-4 w-4" aria-hidden="true" />
      {bookLabel}
    </a>
  );
  const links = (cls: string) => menuItems.map((item) => (
    <a key={item.href} href={item.href} onClick={handleLinkClick} className={cls}>{item.label}</a>
  ));
  const mobileMenu = (
    <div ref={mobileMenuRef} className={`md:hidden overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[25rem] opacity-100 visible pt-4 pb-6' : 'max-h-0 opacity-0 invisible'}`}>
      {links('block py-3 text-lg text-light-text dark:text-dark-text hover:text-primary dark:hover:text-primary-dark transition-colors')}
      <div className="flex items-center gap-4 pt-4 border-t border-light-gray/20 dark:border-dark-gray/20 mt-4">
        {bookButton}
        {languageSwitcher && <LanguageSwitcher />}
        {themeButton}
      </div>
    </div>
  );
  const burger = (
    <button ref={menuButtonRef} onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2" aria-label={isOpen ? t('nav.close_menu') : t('nav.open_menu')} aria-expanded={isOpen}>
      {isOpen ? <X className="h-6 w-6 text-light-text dark:text-dark-text" /> : <Menu className="h-6 w-6 text-light-text dark:text-dark-text" />}
    </button>
  );
  const slide = isVisible ? 'translate-y-0' : '-translate-y-full';
  // text-center: a two-word label ("צור קשר", "תיק עבודות") wraps once the row
  // runs out of width, and a start-aligned second line reads as a ragged
  // column against its neighbours.
  const linkCls = 'text-center text-light-text dark:text-dark-text hover:text-primary dark:hover:text-primary-dark transition-colors font-medium';

  if (navbarStyle === 'minimal') {
    // Logo and one button. Links only in the mobile menu.
    return (
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 transform ${isScrolled || isOpen ? 'bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md shadow-sm' : 'bg-transparent'} ${slide}`}>
        <div className="px-4 py-3 container mx-auto">
          <div className="flex items-center justify-between gap-4">
            {logo('h-10 w-10')}
            <div className="hidden md:flex items-center gap-4">
              {languageSwitcher && <LanguageSwitcher />}
              {themeButton}
              {bookButton}
            </div>
            {burger}
          </div>
          {mobileMenu}
        </div>
      </nav>
    );
  }
  if (navbarStyle === 'centered') {
    // Logo on its own row, the links ruled beneath it.
    return (
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 transform bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md border-b border-light-text/10 dark:border-dark-text/10 ${slide}`}>
        <div className="px-4 py-2 container mx-auto">
          <div className="flex items-center justify-between md:justify-center relative">
            {logo('h-10 w-10')}
            <div className="md:absolute md:inset-inline-end-0 flex items-center gap-3">
              <span className="hidden md:flex items-center gap-3">{languageSwitcher && <LanguageSwitcher />}{themeButton}</span>
              {burger}
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center gap-8 pt-2 mt-2 border-t border-light-text/10 dark:border-dark-text/10 text-sm uppercase tracking-widest">
            {links(linkCls)}
          </div>
          {mobileMenu}
        </div>
      </nav>
    );
  }
  if (navbarStyle === 'pill') {
    // A compact floating pill, centered.
    return (
      <nav className={`fixed top-4 inset-x-4 z-50 transition-all duration-300 transform ${slide}`}>
        <div className={`mx-auto max-w-4xl rounded-full px-4 py-2 flex items-center justify-between gap-4 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md shadow-lg ${isOpen ? 'rounded-3xl' : ''}`}>
          {logo('h-9 w-9')}
          <div className="hidden md:flex items-center gap-6 text-sm">
            {links(linkCls)}
          </div>
          <div className="hidden md:flex items-center gap-2">
            {languageSwitcher && <LanguageSwitcher />}
            {themeButton}
            {bookButton}
          </div>
          {burger}
        </div>
        {isOpen && <div className="mx-auto max-w-4xl mt-2 rounded-3xl px-6 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md shadow-lg">{mobileMenu}</div>}
      </nav>
    );
  }
  if (navbarStyle === 'split') {
    // Links at the start, logo in the middle, the book button at the end.
    return (
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 transform bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md shadow-sm ${slide}`}>
        <div className="px-4 py-3 container mx-auto">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">{links(linkCls)}</div>
            <div className="md:hidden">{burger}</div>
            <div className="justify-self-center">{logo('h-10 w-10')}</div>
            <div className="hidden md:flex items-center justify-end gap-3">
              {languageSwitcher && <LanguageSwitcher />}
              {themeButton}
              {bookButton}
            </div>
            <div className="md:hidden justify-self-end">{themeButton}</div>
          </div>
          {mobileMenu}
        </div>
      </nav>
    );
  }

  const navClassName = (() => {
    const visibility = isVisible ? 'translate-y-0' : '-translate-y-full';
    if (navbarStyle === 'solid') {
      return `fixed top-0 left-0 right-0 z-50 transition-all duration-300 transform bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md shadow-md ${visibility}`;
    }
    if (navbarStyle === 'transparent') {
      return `fixed top-0 left-0 right-0 z-50 transition-all duration-300 transform ${visibility}`;
    }
    // floating (default)
    return `fixed top-4 left-4 right-4 z-50 rounded-2xl mx-auto max-w-7xl transition-all duration-300 transform ${
      isScrolled || isOpen ? 'bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md shadow-lg' : 'bg-transparent'
    } ${visibility}`;
  })();

  return (
    <nav className={navClassName}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handleScrollToTop}
            className="flex items-center gap-2 min-w-0"
            aria-label={t('nav.home')}
          >
            <img
              src={ImagesService.getInstance().getImage(websiteConfig.logoImageName)}
              onError={handleSquareImageError}
              // src={isPreview && websiteConfig.logoImageName?.startsWith('blob:') ? websiteConfig.logoImageName : globals.imagesUrl + websiteConfig.logoImageName}
              alt="Logo"
              className="h-12 w-12 rounded-full object-cover flex-shrink-0"
            />
            <span className="business-name font-bold text-light-text dark:text-dark-text text-lg sm:text-xl lg:text-2xl whitespace-nowrap">
              {websiteConfig.businessName}
            </span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            {menuItems.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className="text-center text-light-text dark:text-dark-text hover:text-primary dark:hover:text-primary-dark transition-colors font-medium"
                onClick={handleLinkClick}
              >
                {item.label}
              </a>
            ))}

            {languageSwitcher && <LanguageSwitcher />}

            {showDarkMode && (
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full transition-colors ${isScrolled
                  ? 'bg-light-gray dark:bg-dark-surface hover:bg-primary/10 dark:hover:bg-primary-dark/10'
                  : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'
                  }`}
                aria-label={t('common.toggle_dark_mode', { defaultValue: 'Toggle dark mode' })}
              >
                {!darkMode ? (
                  <Moon className="h-5 w-5 text-light-text dark:text-dark-text" />
                ) : (
                  <Sun className="h-5 w-5 text-light-text dark:text-dark-text" />
                )}
              </button>
            )}
          </div>

          <button
            ref={menuButtonRef}
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2"
            aria-label={isOpen ? t('nav.close_menu') : t('nav.open_menu')}
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <X className="h-6 w-6 text-light-text dark:text-dark-text" />
            ) : (
              <Menu className="h-6 w-6 text-light-text dark:text-dark-text" />
            )}
          </button>
        </div>

        <div
          ref={mobileMenuRef}
          className={`md:hidden overflow-hidden transition-all duration-300 ${isOpen
            ? 'max-h-[25rem] opacity-100 visible pt-4 pb-6'
            : 'max-h-0 opacity-0 invisible'
            }`}
        >
          {menuItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block py-3 text-lg text-light-text dark:text-dark-text hover:text-primary dark:hover:text-primary-dark transition-colors"
              onClick={handleLinkClick}
            >
              {item.label}
            </a>
          ))}

          <div className="flex items-center gap-4 pt-4 border-t border-light-gray/20 dark:border-dark-gray/20 mt-4">
            {languageSwitcher && <LanguageSwitcher />}

            {showDarkMode && (
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full transition-colors ${isScrolled
                  ? 'bg-light-gray dark:bg-dark-surface hover:bg-primary/10 dark:hover:bg-primary-dark/10'
                  : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'
                  }`}
                aria-label={t('common.toggle_dark_mode', { defaultValue: 'Toggle dark mode' })}
              >
                {!darkMode ? (
                  <Moon className="h-5 w-5 text-light-text dark:text-dark-text" />
                ) : (
                  <Sun className="h-5 w-5 text-light-text dark:text-dark-text" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
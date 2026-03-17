import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import LanguageSwitcher from '../LanguageSwitcher';
import globals from '../../services/globals';

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
}

interface NavbarProps {
  websiteConfig: WebsiteConfig;
}

const Navbar: React.FC<NavbarProps> = ({ websiteConfig }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? savedMode === 'true' : false;
  });
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
    setDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
  };

  const menuItems = [
    { href: "#about", label: t('nav.about'), visible: websiteConfig.components.about.visible },
    { href: "#portfolio", label: t('nav.portfolio'), visible: websiteConfig.components.portfolio.visible },
    { href: "#schedule", label: t('nav.schedule'), visible: true },
    { href: "#contact", label: t('nav.contact'), visible: websiteConfig.components.contact.visible }
  ].filter(item => item.visible === undefined || item.visible);

  const { visible, darkMode: showDarkMode, languageSwitcher } = websiteConfig.components.navbar;

  if (!visible) return null;

  return (
    <nav
      className={`fixed top-4 left-4 right-4 z-50 rounded-2xl mx-auto max-w-7xl transition-all duration-300 transform ${isScrolled || isOpen
          ? 'bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md shadow-lg'
          : 'bg-transparent'
        } ${isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handleScrollToTop}
            className="flex items-center gap-2 min-w-0"
          >
            <img
              // src={servcie.getImage(websiteConfig.logoImageName)} 
              src={globals.imagesUrl + websiteConfig.logoImageName}
              alt="Logo"
              className="h-12 w-12 rounded-full object-cover flex-shrink-0"
            />
            <span className="business-name font-bold text-light-text dark:text-dark-text text-lg sm:text-xl lg:text-2xl whitespace-nowrap">
              {websiteConfig.businessName}
            </span>
          </button>

          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className="text-light-text dark:text-dark-text hover:text-primary dark:hover:text-primary-dark transition-colors font-medium"
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
              >
                {!darkMode ? (
                  <Moon className="h-5 w-5 text-light-text" />
                ) : (
                  <Sun className="h-5 w-5 text-dark-text" />
                )}
              </button>
            )}
          </div>

          <button
            ref={menuButtonRef}
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2"
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
              ? 'max-h-[400px] opacity-100 visible pt-4 pb-6'
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
              >
                {!darkMode ? (
                  <Moon className="h-5 w-5 text-light-text" />
                ) : (
                  <Sun className="h-5 w-5 text-dark-text" />
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
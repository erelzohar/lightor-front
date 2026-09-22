import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import LanguageSwitcher from '../LanguageSwitcher';
import globals from '../../services/globals';
import ImagesService from '../../services/ImagesService';
import { handleSquareImageError } from '../../utils/imageFallback';
import { useIsDarkMode } from '../../hooks/useIsDarkMode';
import { navLinksFromBlocks, sectionTitlesOf } from '../../services/navLinks';
import { hasBookableServices } from '../../models/AppointmentType';
import { Calendar } from 'lucide-react';

// LT-190: the business name is never cut. On phones the brand block may
// shrink so a long name drops to a second line; from md up it keeps its width
// (the links row collapses into the burger instead, LT-173) and wraps past
// 16rem rather than truncating. --nav-offset follows the taller bar.
const BRAND_CLS = 'flex items-center gap-2 min-w-0 shrink md:shrink-0';
const NAME_CLS = 'business-name font-bold text-light-text dark:text-dark-text leading-tight text-start break-words min-w-0 max-w-[16rem]';

interface WebsiteConfig {
  logoImageName: string;
  businessName: string;
  components: {
    navbar: {
      visible: boolean;
      darkMode: boolean;
      languageSwitcher: boolean;
    };
    // LT-168: section titles double as the menu labels.
    about: { visible: boolean; title?: string };
    portfolio: { visible: boolean; title?: string };
    contact: { visible: boolean; title?: string };
    schedule?: { title?: string };
    faq?: { title?: string };
  };
  design?: {
    navbarStyle?: 'floating' | 'solid' | 'transparent' | 'minimal' | 'centered' | 'pill' | 'split';
    borderRadius?: string;
  };
  /** LT-137: a composed page — links come from these, not the section flags. */
  blocks?: { type: string; id: string }[];
  /** LT-167: no named service → no "Book" link or button. */
  appointmentTypes?: { name?: string | null }[];
}

interface NavbarProps {
  websiteConfig: WebsiteConfig;
  isPreview?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ websiteConfig, isPreview }) => {
  const [isOpen, setIsOpen] = useState(false);
  // The bar itself, measured so the page can clear it (LT-163).
  const navRef = useRef<HTMLElement>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
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
        // The bar's real bottom edge (LT-163) rather than a guessed 80px: the
        // styles run from 57 to 109px tall, and a long name can wrap.
        const navbarHeight = navRef.current ? navRef.current.offsetTop + navRef.current.offsetHeight : 80;
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
  const bookable = hasBookableServices(websiteConfig.appointmentTypes);
  // LT-168: a link reads as the heading it scrolls to; the generic label only when a section has none.
  const titles = sectionTitlesOf(websiteConfig.components);
  const menuItems = websiteConfig.blocks?.length
    ? navLinksFromBlocks(websiteConfig.blocks.filter((b) => bookable || b.type !== 'schedule'), titles).map((l) => ({
      href: l.href,
      label: l.title ?? t(l.key, { defaultValue: language === 'he' ? l.fallbackHe : l.fallbackEn }),
      visible: true,
    }))
    : [
      { href: "#about", label: titles.about ?? t('nav.about'), visible: websiteConfig.components.about.visible },
      { href: "#portfolio", label: titles.portfolio ?? t('nav.portfolio'), visible: websiteConfig.components.portfolio.visible },
      { href: "#schedule", label: titles.schedule ?? t('nav.schedule'), visible: bookable },
      { href: "#contact", label: titles.contact ?? t('nav.contact'), visible: websiteConfig.components.contact.visible }
    ].filter(item => item.visible === undefined || item.visible);

  const { visible, darkMode: showDarkMode, languageSwitcher } = websiteConfig.components.navbar;
  const navbarStyle = websiteConfig.design?.navbarStyle ?? 'floating';
  // LT-173: the desktop links row is nowrap and clipped. When its content is
  // wider than the room it gets, the links go invisible and the burger takes
  // over at every width. Only visibility toggles — never layout — so the
  // measurement below cannot oscillate.
  const [cramped, setCramped] = useState(false);
  const linksRowRef = useRef<HTMLDivElement>(null);
  const labelsKey = menuItems.map((m) => m.label).join('|');

  /**
   * Publish where the bar ends as `--nav-offset` on the page (LT-163), so the
   * hero can start below it. The bar is fixed, and its height depends on the
   * style (57 to 109px measured), the breakpoint, whether the business name
   * wraps and when the web font lands — a fixed padding under-cleared it on
   * phones and the hero image slid beneath it.
   *
   * offsetTop counts a floating bar's gap from the top; offsetHeight ignores
   * the hide-on-scroll transform. An open phone menu is an overlay, so its
   * extra height is deliberately not published: the page would jump.
   */
  useEffect(() => {
    const root = document.documentElement;
    const nav = navRef.current;
    if (!nav) {
      root.style.setProperty('--nav-offset', '0px');
      return;
    }
    const publish = () => {
      if (isOpenRef.current) return;
      root.style.setProperty('--nav-offset', `${Math.ceil(nav.offsetTop + nav.offsetHeight)}px`);
    };
    publish();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(publish) : null;
    observer?.observe(nav);
    window.addEventListener('resize', publish);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', publish);
    };
  }, [navbarStyle, visible]);

  useEffect(() => {
    const row = linksRowRef.current;
    if (!row) { setCramped(false); return; }
    const measure = () => setCramped(row.scrollWidth > row.clientWidth + 1);
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(row);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [navbarStyle, visible, labelsKey]);

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
    <button onClick={handleScrollToTop} className={BRAND_CLS} aria-label={t('nav.home')}>
      <img src={ImagesService.getInstance().getImage(websiteConfig.logoImageName)} onError={handleSquareImageError} alt="Logo" className={`${cls} rounded-full object-cover flex-shrink-0`} />
      <span className={`${NAME_CLS} text-lg sm:text-xl`}>{websiteConfig.businessName}</span>
    </button>
  );
  const bookButton = bookable ? (
    <a href="#schedule" onClick={handleLinkClick} className="inline-flex items-center gap-2 bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark font-bold px-5 py-2.5 rounded-design text-sm hover:opacity-90 transition-opacity whitespace-nowrap">
      <Calendar className="h-4 w-4" aria-hidden="true" />
      {bookLabel}
    </a>
  ) : null;
  const links = (cls: string) => menuItems.map((item) => (
    <a key={item.href} href={item.href} onClick={handleLinkClick} className={cls}>{item.label}</a>
  ));
  /** The desktop links, in the one row the overflow watcher measures. */
  const linksRow = (rowCls: string, cls: string) => (
    <div ref={linksRowRef} className={`${rowCls} min-w-0 overflow-hidden whitespace-nowrap ${cramped ? 'invisible' : ''}`} aria-hidden={cramped || undefined}>
      {links(cls)}
    </div>
  );
  const mobileMenu = (
    <div ref={mobileMenuRef} className={`${cramped ? '' : 'md:hidden'} overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[25rem] opacity-100 visible pt-4 pb-6' : 'max-h-0 opacity-0 invisible'}`}>
      {links('block py-3 text-lg text-light-text dark:text-dark-text hover:text-primary dark:hover:text-primary-dark transition-colors')}
      <div className="flex items-center gap-4 pt-4 border-t border-light-gray/20 dark:border-dark-gray/20 mt-4">
        {bookButton}
        {languageSwitcher && <LanguageSwitcher />}
        {themeButton}
      </div>
    </div>
  );
  const burger = (
    <button ref={menuButtonRef} onClick={() => setIsOpen(!isOpen)} className={`${cramped ? '' : 'md:hidden'} p-2`} aria-label={isOpen ? t('nav.close_menu') : t('nav.open_menu')} aria-expanded={isOpen}>
      {isOpen ? <X className="h-6 w-6 text-light-text dark:text-dark-text" /> : <Menu className="h-6 w-6 text-light-text dark:text-dark-text" />}
    </button>
  );
  const slide = isVisible ? 'translate-y-0' : '-translate-y-full';
  // LT-173: labels never wrap — a row that runs out of width collapses into
  // the burger instead (see the overflow watcher above).
  const linkCls = 'text-center whitespace-nowrap text-light-text dark:text-dark-text hover:text-primary dark:hover:text-primary-dark transition-colors font-medium';

  if (navbarStyle === 'minimal') {
    // Logo and one button. Links only in the mobile menu.
    return (
      <nav ref={navRef} className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 transform ${isScrolled || isOpen ? 'bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md shadow-sm' : 'bg-transparent'} ${slide}`}>
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
      <nav ref={navRef} className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 transform bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md border-b border-light-text/10 dark:border-dark-text/10 ${slide}`}>
        <div className="px-4 py-2 container mx-auto">
          <div className="flex items-center justify-between md:justify-center relative">
            {logo('h-10 w-10')}
            <div className="md:absolute md:inset-inline-end-0 flex items-center gap-3">
              <span className="hidden md:flex items-center gap-3">{languageSwitcher && <LanguageSwitcher />}{themeButton}</span>
              {burger}
            </div>
          </div>
          {linksRow(`hidden md:flex items-center justify-center gap-8 text-sm uppercase tracking-widest ${cramped ? 'h-0' : 'pt-2 mt-2 border-t border-light-text/10 dark:border-dark-text/10'}`, linkCls)}
          {mobileMenu}
        </div>
      </nav>
    );
  }
  if (navbarStyle === 'pill') {
    // A compact floating pill, centered.
    return (
      <nav ref={navRef} className={`fixed top-4 inset-x-4 z-50 transition-all duration-300 transform ${slide}`}>
        <div className={`mx-auto max-w-4xl rounded-full px-4 py-2 flex items-center justify-between gap-4 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md shadow-lg ${isOpen ? 'rounded-3xl' : ''}`}>
          {logo('h-9 w-9')}
          {linksRow('hidden md:flex items-center gap-6 text-sm', linkCls)}
          <div className="hidden md:flex items-center gap-2 shrink-0">
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
      <nav ref={navRef} className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 transform bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md shadow-sm ${slide}`}>
        <div className="px-4 py-3 container mx-auto">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            {linksRow('hidden md:flex items-center gap-6 text-sm font-medium', linkCls)}
            <div className={cramped ? '' : 'md:hidden'}>{burger}</div>
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
    <nav ref={navRef} className={navClassName}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handleScrollToTop}
            className={BRAND_CLS}
            aria-label={t('nav.home')}
          >
            <img
              src={ImagesService.getInstance().getImage(websiteConfig.logoImageName)}
              onError={handleSquareImageError}
              // src={isPreview && websiteConfig.logoImageName?.startsWith('blob:') ? websiteConfig.logoImageName : globals.imagesUrl + websiteConfig.logoImageName}
              alt="Logo"
              className="h-12 w-12 rounded-full object-cover flex-shrink-0"
            />
            <span className={`${NAME_CLS} text-lg sm:text-xl lg:text-2xl`}>
              {websiteConfig.businessName}
            </span>
          </button>

          <div className="hidden md:flex items-center gap-8 min-w-0">
            {linksRow('flex items-center gap-8', linkCls)}

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
            className={`${cramped ? '' : 'md:hidden'} p-2`}
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
          className={`${cramped ? '' : 'md:hidden'} overflow-hidden transition-all duration-300 ${isOpen
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
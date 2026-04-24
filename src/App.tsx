import { useState, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Layout/Navbar';
import Hero from './components/Layout/Hero';
import About from './components/Layout/About';
import Portfolio from './components/Portfolio';
import Schedule from './components/Layout/Schedule/Schedule';
import Contact from './components/Layout/Contact';
import Footer from './components/Layout/Footer';
import IntroPopup from './components/IntroPopup';
import ContactButton from './components/ContactButton';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './components/NotFound';
import ManageAppointment from './components/ManageAppointment';
import { useLanguage } from './contexts/LanguageContext';
import { WebsiteConfig } from './models/WebsiteConfig';
import WebConfigService from './services/WebConfigService';
import Loading from './components/Loading';
import ImagesService from './services/ImagesService';
import { useTheme } from './hooks/useTheme';
import { reportError } from './services/ErrorReportingService';
import { Turnstile } from '@marsidev/react-turnstile';
import AuthService from './services/AuthService';

function MainContent() {
  const [config, setConfig] = useState<WebsiteConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const { setLanguage } = useLanguage();

  // Ref to prevent double-handshake in React StrictMode
  const handshakeInProgress = useRef(false);

  // 1. Handshake Logic
  const handleHandshake = async (token: string) => {
    if (handshakeInProgress.current || isAuthorized) return;
    handshakeInProgress.current = true;

    const success = await AuthService.handshake(token);
    if (success) {
      setIsAuthorized(true);
    } else {
      // If handshake fails, keep loading or show error
      console.error("Security verification failed.");
    }
    handshakeInProgress.current = false;
  };
  useEffect(() => {
    if (!isAuthorized) return;
    const loadConfig = async () => {
      try {
        const subdomain = window.location.hostname.split('.')[0];
        const service = WebConfigService.getInstance();
        const result = await service.getWebConfig(subdomain);
        if (result) {
          setConfig(result);
          setLanguage(result.defaultLanguage as 'en' | 'he');

          // Update SEO and Meta tags
          document.title = result.businessName;

          const updateMetaTag = (attrName: 'name' | 'property', attrValue: string, content: string) => {
            let tag = document.querySelector(`meta[${attrName}="${attrValue}"]`);
            if (!tag) {
              tag = document.createElement('meta');
              tag.setAttribute(attrName, attrValue);
              document.head.appendChild(tag);
            }
            tag.setAttribute('content', content);
          };

          updateMetaTag('name', 'title', result.businessName);
          updateMetaTag('property', 'og:title', result.businessName);
          updateMetaTag('property', 'twitter:title', result.businessName);

          const description = result.components?.about?.description || `הזמן תור בקלות אצל ${result.businessName}`;
          updateMetaTag('name', 'description', description);
          updateMetaTag('property', 'og:description', description);
          updateMetaTag('property', 'twitter:description', description);

          if (result.logoImageName) {
            const logoUrl = ImagesService.getInstance().getImage(result.logoImageName);

            const icons = document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]');
            icons.forEach(icon => (icon as HTMLLinkElement).href = logoUrl);

            updateMetaTag('property', 'og:image', logoUrl);
            updateMetaTag('property', 'twitter:image', logoUrl);
          }
        }
      } catch (err: any) {
        // Check for 404 status in both Axios error and custom error
        const isNotFoundError = err.status === 404 || err.response?.status === 404;

        if (!isNotFoundError) {
          reportError({
            error: err.message || 'Failed to load website configuration',
            stack: err.stack
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [setLanguage, isAuthorized]);

  useTheme(config);

  if (!isAuthorized) {
    return (
      <>
        <Loading isLoading={true} />
        <div style={{ display: 'none' }}>
          <Turnstile
            siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
            onSuccess={handleHandshake}
          />
        </div>
      </>
    );
  }

  if (loading && !config) return <Loading isLoading={loading} />;
  if (!config) return <NotFound />;

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      {config.components?.introPopup?.visible && (
        <ErrorBoundary>
          <IntroPopup config={config.components.introPopup} />
        </ErrorBoundary>
      )}
      {config.components?.navbar.visible && (
        <ErrorBoundary>
          <Navbar websiteConfig={config} />
        </ErrorBoundary>
      )}
      {config.components?.hero.visible && (
        <ErrorBoundary>
          <Hero config={config.components.hero} social={config.social} phone={config.contact.phone} isContactVisible={config.components.contact.visible} />
        </ErrorBoundary>
      )}
      {config.components?.about.visible && (
        <ErrorBoundary>
          <About
            config={config.components.about}
            websiteConfig={{
              address: config.address,
              contact: config.contact,
              social: config.social,
              workingDays: config.workingDays
            }}
          />
        </ErrorBoundary>
      )}
      {config.components?.portfolio.visible && (
        <ErrorBoundary>
          <Portfolio config={config.components.portfolio} />
        </ErrorBoundary>
      )}
      {config.components?.schedule && (
        <ErrorBoundary>
          <Schedule
            config={config.components.schedule}
            workingDays={config.workingDays}
            user_id={config.user_id}
            phone={config.contact.phone}
            businessName={config.businessName}
            timeToCancel={config.minCancelTimeMS}
            vacations={config.vacations}
            appointmentTypes={config.appointmentTypes}
          // minsPerSlot={config.minsPerSlot}
          />
        </ErrorBoundary>
      )}
      {config.components?.contact.visible && (
        <ErrorBoundary>
          <Contact
            config={config.components.contact}
            address={config.address}
            contact={config.contact}
            workingDays={config.workingDays}
          />
        </ErrorBoundary>
      )}
      {config.components?.footer.visible && (
        <ErrorBoundary>
          <Footer
            config={config.components.footer}
            appointmentsType={config.appointmentTypes}
            social={config.social}
            businessName={config.businessName}
            logoImageName={config.logoImageName}
            websiteConfig={config.components}
          />
        </ErrorBoundary>
      )}
      {config.components?.contactButton.visible && (
        <ErrorBoundary>
          <ContactButton phone={config.contact.phone} />
        </ErrorBoundary>
      )}
    </div>
  );
}

function App() {
  useEffect(() => {
    // Load user preference from localStorage first
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      if (savedMode === 'true') {
        document.documentElement.classList.add('dark');
      }
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem('darkMode') === null) {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return (
    <Routes>
      <Route path="/" element={<MainContent />} />
      <Route path="/manage/:appointment-id" element={<ManageAppointment />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
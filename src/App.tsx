import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

// Components & Services
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
import Loading from './components/Loading';

// Contexts & Hooks
import { useLanguage } from './contexts/LanguageContext';
import { WebsiteConfig } from './models/WebsiteConfig';
import WebConfigService from './services/WebConfigService';
import ImagesService from './services/ImagesService';
import { useTheme } from './hooks/useTheme';
import { reportError } from './services/ErrorReportingService';
import { Loader2 } from 'lucide-react';

function MainContent() {
  const [config, setConfig] = useState<WebsiteConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { setLanguage } = useLanguage();


  // 2. Load Config IMMEDIATELY (Public Data)
  useEffect(() => {
    const loadConfig = async () => {

      try {
        const subdomain = window.location.hostname.split('.')[0];
        const result = await WebConfigService.getInstance().getWebConfig(subdomain);

        if (result) {
          setConfig(result);
          setLanguage(result.defaultLanguage as 'en' | 'he');
          document.title = result.businessName;

          // Helper for SEO Meta Tags
          const updateMetaTag = (attrName: 'name' | 'property', attrValue: string, content: string) => {
            let tag = document.querySelector(`meta[${attrName}="${attrValue}"]`);
            if (!tag) {
              tag = document.createElement('meta');
              tag.setAttribute(attrName, attrValue);
              document.head.appendChild(tag);
            }
            tag.setAttribute('content', content);
          };

          updateMetaTag('property', 'og:title', result.businessName);
          const description = result.components?.about?.description || `Book an appointment at ${result.businessName}`;
          updateMetaTag('name', 'description', description);

          if (result.logoImageName) {
            const logoUrl = ImagesService.getInstance().getImage(result.logoImageName);
            updateMetaTag('property', 'og:image', logoUrl);
          }
        }
      } catch (err: any) {
        if (err.status !== 404 && err.response?.status !== 404) {
          reportError({ error: err.message, stack: err.stack });
        }
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [setLanguage]);

  useTheme(config);

  if (loading) return <Loading isLoading={true} />;
  if (!config) return <NotFound />;

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      {config.components?.introPopup?.visible && (
        <ErrorBoundary><IntroPopup config={config.components.introPopup} /></ErrorBoundary>
      )}

      {config.components?.navbar.visible && (
        <ErrorBoundary><Navbar websiteConfig={config} /></ErrorBoundary>
      )}

      {config.components?.hero.visible && (
        <ErrorBoundary>
          <Hero
            config={config.components.hero}
            social={config.social}
            phone={config.contact.phone}
            isContactVisible={config.components.contact.visible}
          />
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
        <ErrorBoundary><Portfolio config={config.components.portfolio} /></ErrorBoundary>
      )}

      {/* --- SENSITIVE SECTION: Turnstile protects the Schedule only --- */}
      {config.components?.schedule && (
        <ErrorBoundary>
          <div id="booking-section" className="relative min-h-[400px]">
            <Schedule
              config={config.components.schedule}
              workingDays={config.workingDays}
              user_id={config.user_id}
              phone={config.contact.phone}
              businessName={config.businessName}
              timeToCancel={config.minCancelTimeMS}
              vacations={config.vacations}
              appointmentTypes={config.appointmentTypes}
            />
          </div>
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
        <ErrorBoundary><ContactButton phone={config.contact.phone} /></ErrorBoundary>
      )}
    </div>
  );
}

// App stays simple, handling routing and global theme
function App() {
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') document.documentElement.classList.add('dark');

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem('darkMode') === null) {
        e.matches ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
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
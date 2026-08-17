import { useState, useEffect, useRef, Fragment, type ReactNode } from 'react';
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
import LightorBadge from './components/LightorBadge';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './components/NotFound';
import ManageAppointment from './components/ManageAppointment';
import Loading from './components/Loading';
import SectionDivider, { type SectionTone } from './components/SectionDivider';

// Contexts & Hooks
import { useLanguage, Language } from './contexts/LanguageContext';
import { WebsiteConfig } from './models/WebsiteConfig';
import WebConfigService from './services/WebConfigService';
import ImagesService from './services/ImagesService';
import { useTheme } from './hooks/useTheme';
import { reportError } from './services/ErrorReportingService';

// Origins permitted to drive this app through a PREVIEW_DATA postMessage.
// Only the register and dashboard apps embed the public site in an iframe for
// live preview; no other page may inject a config.
const PREVIEW_PARENT_HOSTNAMES = new Set([
  'register.lightor.app',
  'dashboard.lightor.app',
]);

const LOCAL_DEV_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

// The origin is parsed and compared by hostname rather than string-matched.
// A naive check such as origin.endsWith('.lightor.app') is defeated by
// look-alike hosts like "https://evil-lightor.app" or
// "https://register.lightor.app.attacker.com".
const isAllowedPreviewOrigin = (origin: string): boolean => {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    // Opaque origins (sandboxed iframes, file://) arrive as the string "null".
    return false;
  }

  // Trusted parents are always served over TLS in production.
  if (PREVIEW_PARENT_HOSTNAMES.has(url.hostname)) return url.protocol === 'https:';

  // Local development: any port, http or https. Gated on the dev build so a
  // production bundle never trusts a locally-served page — Vite statically
  // replaces import.meta.env.DEV, so this branch is dropped entirely at build.
  if (!import.meta.env.DEV) return false;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  return LOCAL_DEV_HOSTNAMES.has(url.hostname);
};

function MainContent() {
  const [config, setConfig] = useState<WebsiteConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const isPreviewRef = useRef(false);
  const { setLanguage } = useLanguage();

  // Keep a stable ref to setLanguage so the message listener never needs to
  // re-register when the context returns a new function reference.
  const setLanguageRef = useRef(setLanguage);
  useEffect(() => { setLanguageRef.current = setLanguage; }, [setLanguage]);

  // Listen for preview data from a parent window (iframe preview mode).
  // Empty deps: register once on mount and never tear down mid-session.
  // Using setLanguageRef avoids stale closures without causing re-registration,
  // which was the root cause of dropped postMessages (listener was briefly
  // absent right after each setLanguage call triggered effect cleanup).
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PREVIEW_DATA') {
        // Reject config injected by any page that is not a trusted preview parent.
        if (!isAllowedPreviewOrigin(event.origin)) {
          console.warn('[lightor-front] Ignored PREVIEW_DATA from untrusted origin:', event.origin);
          return;
        }
        isPreviewRef.current = true;
        // The parent posts a plain JSON config. Run it through fromJSON so a
        // stylePreset expands into concrete design tokens exactly as it does
        // for a real site — previously the raw cast skipped expansion and
        // previews rendered with default tokens instead of the preset (LT-039).
        let cfg: WebsiteConfig;
        try {
          cfg = WebsiteConfig.fromJSON(event.data.config);
        } catch {
          // Tolerate partial preview payloads rather than blanking the preview.
          cfg = event.data.config as WebsiteConfig;
        }
        setConfig(cfg);
        setIsPreview(true);
        setLoading(false);
        setLanguageRef.current(cfg.defaultLanguage as Language);
      }
    };
    window.addEventListener('message', handleMessage);

    // Safety valve: if we are inside an iframe and the parent never sends
    // PREVIEW_DATA (message lost in a race, or X-Frame-Options blocked
    // embedding), stop the infinite loading spinner after 6 seconds so the
    // user sees something useful instead of spinning forever.
    const isInsideIframe = window.self !== window.top;
    const hasPreviewFlag = new URLSearchParams(window.location.search).has('preview');
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    if (isInsideIframe || hasPreviewFlag) {
      fallbackTimer = setTimeout(() => {
        if (!isPreviewRef.current) {
          console.warn('[lightor-front] PREVIEW_DATA not received within 6 s — releasing loading state.');
          setLoading(false);
        }
      }, 6000);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(fallbackTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load Config from backend (skipped when preview data has already arrived)
  useEffect(() => {
    const loadConfig = async () => {
      const isInsideIframe = window.self !== window.top;

      // 2. בדיקה: האם יש לי flag של preview ב-URL?
      const hasPreviewFlag = new URLSearchParams(window.location.search).has('preview');

      // אם אחד מהם נכון, אנחנו עוצרים הכל ומחכים ל-postMessage
      if (isInsideIframe || hasPreviewFlag || isPreviewRef.current) {
        console.log("Iframe/Preview detected.");
        const style = document.createElement('style');
        console.log(style);
        
        style.textContent = '::-webkit-scrollbar{display:none}html,body{scrollbar-width:none;-ms-overflow-style:none}';
        document.head.appendChild(style);
        return;
      }

      try {
        const subdomain = window.location.hostname.split('.')[0];
        const result = await WebConfigService.getInstance().getWebConfig(subdomain);

        if (isPreviewRef.current) return;

        if (result) {
          setConfig(result);
          setLanguage(result.defaultLanguage as Language);
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
        if (!isPreviewRef.current && err.status !== 404 && err.response?.status !== 404 && process.env.NODE_ENV === 'production') {
          reportError({ error: err.message, stack: err.stack });
        }
      } finally {
        if (!isPreviewRef.current) setLoading(false);
      }
    };

    loadConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useTheme(config);

  if (loading) return <Loading isLoading={true} />;
  if (!config) return <NotFound />;

  // Build the in-flow content sections with their solid background "tone".
  // The page alternates bg <-> surface; dividers are interleaved between
  // consecutive visible sections (see SectionDivider).
  const divider = config.design?.sectionDivider ?? 'none';
  const flow: { key: string; tone: SectionTone; node: ReactNode }[] = [];

  if (config.components?.hero.visible) {
    flow.push({
      key: 'hero', tone: 'bg', node: (
        <Hero
          config={config.components.hero}
          social={config.social}
          phone={config.contact.phone}
          isContactVisible={config.components.contact.visible}
          isPreview={isPreview}
          palette={config.pallete}
          design={config.design}
        />
      )
    });
  }

  if (config.components?.about.visible) {
    flow.push({
      key: 'about', tone: 'surface', node: (
        <About
          config={config.components.about}
          websiteConfig={{
            address: config.address,
            contact: config.contact,
            social: config.social,
            workingDays: config.workingDays
          }}
        />
      )
    });
  }

  if (config.components?.portfolio.visible) {
    flow.push({ key: 'portfolio', tone: 'bg', node: <Portfolio config={config.components.portfolio} /> });
  }

  // --- SENSITIVE SECTION: Turnstile protects the Schedule only ---
  if (config.components?.schedule) {
    flow.push({
      key: 'schedule', tone: 'surface', node: (
        <div id="booking-section" className="relative min-h-[25rem]">
          <Schedule
            config={config.components.schedule}
            workingDays={config.workingDays}
            user_id={config.user_id}
            phone={config.contact.phone}
            businessName={config.businessName}
            timeToCancel={config.minCancelTimeMS}
            vacations={config.vacations}
            appointmentTypes={config.appointmentTypes}
            isPreview={isPreview}
          />
        </div>
      )
    });
  }

  if (config.components?.contact.visible) {
    flow.push({
      key: 'contact', tone: 'bg', node: (
        <Contact
          config={config.components.contact}
          address={config.address}
          contact={config.contact}
          workingDays={config.workingDays}
        />
      )
    });
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      {config.components?.introPopup?.visible && (
        <ErrorBoundary><IntroPopup config={config.components.introPopup} /></ErrorBoundary>
      )}

      {config.components?.navbar.visible && (
        <ErrorBoundary><Navbar websiteConfig={config} isPreview={isPreview} /></ErrorBoundary>
      )}

      {flow.map((s, i) => (
        <Fragment key={s.key}>
          {i > 0 && (
            <SectionDivider variant={divider} aboveTone={flow[i - 1].tone} belowTone={s.tone} />
          )}
          <ErrorBoundary>{s.node}</ErrorBoundary>
        </Fragment>
      ))}

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

      {/* Free-plan badge — deliberately outside the footer conditional, so
          hiding the footer does not hide it (LT-032). */}
      {config.branding && (
        <ErrorBoundary><LightorBadge /></ErrorBoundary>
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
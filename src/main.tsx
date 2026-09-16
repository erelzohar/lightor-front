import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './contexts/LanguageContext';
import './i18n/config';
import RootErrorBoundary from './components/RootErrorBoundary';
import { installGlobalErrorHandlers } from './services/ErrorReportingService';

// Uncaught exceptions and unhandled rejections outside React's render path
// (event handlers, timers, fetches nobody awaited) — see ErrorReportingService.
installGlobalErrorHandlers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <BrowserRouter>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  </StrictMode>
);

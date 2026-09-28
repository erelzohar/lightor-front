import { Clock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const DASHBOARD_URL = 'https://dashboard.lightor.app';

/**
 * A business whose site is not live yet (LT-200): the API refuses the config
 * until the owner confirms their email. The visitor is most often the owner,
 * opening their new site right after signing up — so the page says what is
 * missing and where to fix it, instead of "this page does not exist".
 */
const SiteNotActive = () => {
  const { t } = useLanguage();
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="max-w-md w-full text-center space-y-5" data-testid="site-not-active">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 text-primary dark:text-primary-dark flex items-center justify-center">
          <Clock className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text">{t('inactive.title')}</h1>
        <p className="text-light-text/80 dark:text-dark-text/80">{t('inactive.message')}</p>
        <div className="rounded-2xl border border-light-text/10 dark:border-dark-text/10 bg-light-surface dark:bg-dark-surface p-5 space-y-4">
          <p className="text-sm text-light-text/80 dark:text-dark-text/80">{t('inactive.owner')}</p>
          <a
            href={DASHBOARD_URL}
            className="inline-flex items-center justify-center px-6 py-3 rounded-design bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark font-semibold hover:opacity-90 transition-opacity"
          >
            {t('inactive.button')}
          </a>
        </div>
      </div>
    </main>
  );
};

export default SiteNotActive;

import { useEffect, useState } from 'react';

/**
 * The single source of truth for "is the site rendering dark right now": the
 * `dark` class on <html>, watched for changes.
 *
 * Reading localStorage instead — what the navbar toggle used to do — desynced
 * the toggle from the page. useTheme applies the design's defaultTheme: always
 * in the register/dashboard preview (LT-098), and on a first visit to a
 * dark-first vibe. So a dark site could render with the toggle still believing
 * it was light: it drew the wrong icon (in the wrong, invisible color) and the
 * first click did nothing visible because it "switched" to the mode already on
 * screen. Deriving from the DOM keeps every consumer honest no matter who set
 * the class or when.
 */
export const useIsDarkMode = (): boolean => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.classList.contains('dark'));
    // useTheme's effect runs after this component's first render, so re-read
    // once on mount before trusting the observer for everything after that.
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
};

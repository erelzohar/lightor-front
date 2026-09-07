import type { SectionTone } from '../SectionDivider';

export const TONE_BG: Record<SectionTone, string> = {
  bg: 'bg-light-bg dark:bg-dark-bg',
  surface: 'bg-light-surface dark:bg-dark-surface',
};

/** Display face for the current language (the RTL stack for he/ar). */
export const displayFontFor = (language: string): string =>
  language === 'he' || language === 'ar' ? 'var(--font-heading-rtl)' : 'var(--font-heading)';

/** Arabic cursive joins break under letter-spacing. */
export const trackFor = (language: string, cls = 'tracking-[0.25em]'): string => (language === 'ar' ? '' : cls);

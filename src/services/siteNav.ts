import { createContext, useContext } from 'react';
import type { MouseEvent } from 'react';

/**
 * LT-539: moving between a site's addresses. A section link (`#about`) stays a
 * scroll on the home page and goes through the home page anywhere else. The
 * site's shell provides `go`; outside it (a test, a lone component) a plain
 * navigation does the same.
 */
export interface SiteNav {
  atHome: boolean;
  go: (href: string) => void;
}

export const SiteNavContext = createContext<SiteNav>({
  atHome: true,
  go: (href) => { window.location.href = href; },
});

export const useSiteNav = (): SiteNav => useContext(SiteNavContext);

/** The address of a link from where the visitor is. */
export const linkFrom = (href: string, atHome: boolean): string => (atHome || href.startsWith('/') ? href : `/${href}`);

/** A click that stays in the app; a click with a modifier opens as the browser would. */
export const followLink = (e: MouseEvent, href: string, go: SiteNav['go']): void => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  go(href);
};

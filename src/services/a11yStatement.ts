/**
 * LT-346: the accessibility statement opens from several places (the footer,
 * the strip under the page, the accessibility menu) and from the address
 * `/#accessibility`, so its open state lives here rather than in one
 * component. The links are real `#accessibility` anchors, so they also work
 * as plain links (a new tab, a shared address).
 */

export const STATEMENT_HASH = '#accessibility';

/** The day the statement's wording last changed (shown on it). */
export const STATEMENT_UPDATED = '2026-10-15';

/** Who answers accessibility requests on every Lightor site (Erel 2026-10-15, LT-339 D4). */
export const ACCESSIBILITY_CONTACT = { name: 'EZ Webs', email: 'ezwebsisr@gmail.com' } as const;

let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export const isStatementOpen = (): boolean => open;

export const subscribeStatement = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

export const openStatement = (): void => { open = true; emit(); };

export const closeStatement = (): void => {
  open = false;
  // Drop the hash so a reload does not reopen it, without a history entry.
  if (typeof window !== 'undefined' && window.location.hash === STATEMENT_HASH) {
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  }
  emit();
};

/** A click on one of its links: open in place instead of following the hash. */
export const onStatementLinkClick = (e: { preventDefault: () => void; metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean }): void => {
  if (e.metaKey || e.ctrlKey || e.shiftKey) return; // a new tab or window: let it go
  e.preventDefault();
  openStatement();
};

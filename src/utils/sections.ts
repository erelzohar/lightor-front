/**
 * LT-222: in-page section links — the navbar's, a shared `/#schedule`, the
 * back button — all land the same way: the section's top just under the
 * fixed navbar, whose bottom edge the navbar publishes as `--nav-offset`
 * (LT-163; 0 when there is no bar).
 */

/** Where the fixed navbar ends, in px. */
export const navOffset = (): number => {
  const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-offset'));
  return Number.isFinite(px) ? px : 0;
};

/** The element a `#fragment` names, or null — looked up as an id, never as a selector. */
export const sectionOf = (hash: string | null | undefined): HTMLElement | null => {
  let id = (hash ?? '').replace(/^#/, '');
  try {
    id = decodeURIComponent(id);
  } catch {
    // a malformed escape: look the raw text up
  }
  return id ? document.getElementById(id) : null;
};

/** Bring a section to the top of the viewport, clear of the navbar. */
export const scrollToSection = (el: Element, behavior: ScrollBehavior = 'smooth'): void => {
  const top = el.getBoundingClientRect().top + window.scrollY - navOffset();
  window.scrollTo({ top: Math.max(0, Math.round(top)), behavior });
};

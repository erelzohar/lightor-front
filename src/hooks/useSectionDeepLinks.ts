import { useEffect } from 'react';
import { scrollToSection, sectionOf } from '../utils/sections';

/** The page keeps settling after its first paint — images, the calendar,
 *  sections that animate in — so a deep link is re-aligned for a moment. */
const REALIGN_MS = [0, 120, 350, 700, 1200, 2000, 3000];
/** A visitor who does any of these has taken over the scrolling. */
const TAKEOVER = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;

/**
 * LT-222: `https://<site>/#schedule` lands on its section. The browser's own
 * jump happens while the document is parsed — before React has drawn any
 * section — so it found nothing and the page stayed at the top. Once the
 * site is drawn (`ready`), the section the address names is brought under
 * the navbar, and kept there while the page settles unless the visitor
 * scrolls, taps or types; a later change of the hash (a plain `#` link, the
 * back button) scrolls to its section smoothly.
 */
export function useSectionDeepLinks(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    let following = window.location.hash.length > 1;
    const letGo = () => { following = false; };
    for (const type of TAKEOVER) window.addEventListener(type, letGo, { passive: true });
    const timers = REALIGN_MS.map((ms) => window.setTimeout(() => {
      if (!following) return;
      const el = sectionOf(window.location.hash);
      if (el) scrollToSection(el, 'auto');
    }, ms));
    const onHashChange = () => {
      const el = sectionOf(window.location.hash);
      if (el) scrollToSection(el, 'smooth');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      for (const type of TAKEOVER) window.removeEventListener(type, letGo);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [ready]);
}

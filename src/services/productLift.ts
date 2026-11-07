import { flushSync } from 'react-dom';

/**
 * LT-605: a product carried from the wall of shelves to its page and back
 * (Erel's product shelf): the browser's own view transition, where it has one.
 * The picture wears one name on both sides for the length of the move. Without
 * the API, or with less motion asked for, the page simply changes.
 */
export const LIFT = 'lt-product';

type Transition = { finished: Promise<void> };
type WithTransitions = Document & { startViewTransition?: (update: () => void) => Transition };

/** Where the product was lifted from: the way back lands there, at the same scroll. */
let origin: { path: string; y: number; slug: string } | null = null;
let back: string | null = null;
let settle: Promise<void> = Promise.resolve();

const canLift = (still: boolean): boolean =>
  !still && typeof document !== 'undefined' && typeof (document as WithTransitions).startViewTransition === 'function';

const run = (update: () => void): Transition | null => {
  try {
    return (document as WithTransitions).startViewTransition!(() => flushSync(update));
  } catch {
    return null;
  }
};

/** From a wall: `picture` (the product's own) flies to the product's page at `href`. */
export const liftTo = (picture: HTMLElement | null, slug: string, href: string, go: (href: string) => void, still: boolean): void => {
  origin = { path: `${window.location.pathname}${window.location.search}`, y: window.scrollY, slug };
  if (!picture || !canLift(still)) { go(href); return; }
  picture.style.setProperty('view-transition-name', LIFT);
  const move = run(() => {
    picture.style.removeProperty('view-transition-name');
    go(href);
  });
  if (!move) {
    picture.style.removeProperty('view-transition-name');
    go(href);
  }
};

/** The wall the product came from, when it came from one; else `fallback`. */
export const wayBack = (slug: string, fallback: string): string => (origin?.slug === slug ? origin.path : fallback);

/**
 * From a product's page back to its wall: the wall's place for `slug` takes the
 * picture back, the page scrolled as the visitor left it.
 */
export const liftBack = (slug: string, href: string, go: (href: string) => void, still: boolean): void => {
  const y = origin?.slug === slug && origin.path === href ? origin.y : 0;
  const land = () => {
    go(href);
    window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
  };
  if (!canLift(still)) { land(); return; }
  back = slug;
  const move = run(land);
  if (!move) { back = null; land(); return; }
  settle = move.finished.catch(() => undefined).then(() => { back = null; });
};

/** Is the wall drawing `slug`'s place at the end of a move back? */
export const comingBack = (slug: string): boolean => back === slug;

/** Resolves once the move under way is over. */
export const afterMove = (): Promise<void> => settle;

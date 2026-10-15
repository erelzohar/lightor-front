import { useSyncExternalStore } from 'react';
import { getA11yPrefs, subscribeA11yPrefs, type A11yPrefs } from '../services/a11yPrefs';
import { systemReducedMotion } from '../services/generateReveal';

/** LT-346: the visitor's accessibility-menu choices, re-rendering on change. */
export const useA11yPrefs = (): A11yPrefs => useSyncExternalStore(subscribeA11yPrefs, getA11yPrefs, getA11yPrefs);

const QUERY = '(prefers-reduced-motion: reduce)';

const subscribeSystem = (fn: () => void) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener?.('change', fn);
  return () => mq.removeEventListener?.('change', fn);
};

/**
 * LT-346: hold still — the device asks for less motion, or the visitor chose
 * "stop animations" in the menu. Live: flips the moment either changes.
 */
export const useStill = (): boolean => {
  const system = useSyncExternalStore(subscribeSystem, systemReducedMotion, () => false);
  return useA11yPrefs().still || system;
};

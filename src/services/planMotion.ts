import { createContext, useContext } from 'react';
import { useStill } from '../hooks/useA11yPrefs';

/**
 * LT-570 (Erel 2026-11-03): the ten designs that really move do so on a paid
 * plan only: the products' belt, hanger and coverflow, the clothesline,
 * cascade and curve galleries, the parallax and expand heroes, and the sonar
 * and metal backdrops. On the free plan the server serves `motion: false` and
 * the site holds them still, as it does for a visitor who asked for less
 * motion; the curve, which held still shows only some of its pictures, is
 * drawn as a masonry. The pick stays the owner's, so an upgrade brings the
 * motion back. Absent (the register's preview, the editor) reads as moving.
 */
export const PlanMotionContext = createContext<boolean>(true);

export const usePlanMotion = (): boolean => useContext(PlanMotionContext);

/** One of the ten, held still: the visitor asked for less motion, or the site's plan has none. */
export const useMotionDesignStill = (): boolean => {
  const still = useStill();
  return !usePlanMotion() || still;
};

import React from 'react';
import type { SectionDivider as DividerVariant } from '../models/DesignConfig';

// Each content section has a solid "tone": the page alternates bg <-> surface.
// A divider sits in-flow between two sections; its strip background matches the
// section ABOVE and its SVG shape is filled with the section BELOW, so both
// edges blend seamlessly and the shape reads as the lower section rising up.
export type SectionTone = 'bg' | 'surface';

const TONE_BG: Record<SectionTone, string> = {
  bg: 'bg-light-bg dark:bg-dark-bg',
  surface: 'bg-light-surface dark:bg-dark-surface',
};

const TONE_TEXT: Record<SectionTone, string> = {
  bg: 'text-light-bg dark:text-dark-bg',
  surface: 'text-light-surface dark:text-dark-surface',
};

// Paths fill the bottom of a 1200x100 viewBox (the edge touching the lower
// section) with a shaped top edge. preserveAspectRatio="none" lets them stretch.
const PATHS: Record<Exclude<DividerVariant, 'none'>, string> = {
  wave: 'M0,50 C300,100 900,0 1200,50 L1200,100 L0,100 Z',
  diagonal: 'M0,100 L1200,20 L1200,100 Z',
  curve: 'M0,70 Q600,10 1200,70 L1200,100 L0,100 Z',
};

interface Props {
  variant: DividerVariant;
  aboveTone: SectionTone;
  belowTone: SectionTone;
  /** Seeded per-site (LT-053): mirrors the shape horizontally, so the same
   *  wave/diagonal leans the other way on a different site. */
  mirror?: boolean;
}

const SectionDivider: React.FC<Props> = ({ variant, aboveTone, belowTone, mirror = false }) => {
  // No shape requested, or neighbours share a tone (nothing would be visible).
  if (variant === 'none' || aboveTone === belowTone) return null;

  return (
    <div className={`${TONE_BG[aboveTone]} leading-[0]`} aria-hidden="true">
      <svg
        className={`block w-full h-10 md:h-16 ${TONE_TEXT[belowTone]} ${mirror ? '-scale-x-100' : ''}`}
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
      >
        <path fill="currentColor" d={PATHS[variant]} />
      </svg>
    </div>
  );
};

export default SectionDivider;

import React from 'react';

/**
 * LT-164: an endlessly rolling text strip — the services "shop sign" in the
 * hero band, the standalone ticker block and the footer ticker.
 *
 * Two copies of the text sit side by side on a `w-max` track; `lt-marquee`
 * (index.css) slides the track half its width per cycle, so the loop is
 * seamless, and `[dir="rtl"]` flips the direction, so Hebrew/Arabic roll the
 * way they read with no JS. The separators are non-breaking so nothing
 * collapses at the seam, and the duration scales with the text so the speed
 * stays near 60px/s whether the tenant has one service or twelve.
 *
 * The visual is aria-hidden: callers that want the services announced put an
 * aria-label on their own wrapper (TickerBlock does).
 */

const SEP = ' · ';
// Enough repeats that one copy always outruns the widest viewport — a copy
// narrower than the screen would leave a gap at the end of each cycle.
const MIN_ITEMS = 40;

interface Props {
  items: string[];
  className?: string;
}

const MarqueeStrip: React.FC<Props> = ({ items, className = '' }) => {
  const source = items.filter(Boolean);
  if (!source.length) return null;
  const copy = Array.from({ length: Math.ceil(MIN_ITEMS / source.length) }, () => source)
    .flat()
    .join(SEP) + SEP;
  const duration = Math.max(30, Math.round(copy.length * 0.13));
  return (
    <div className={`overflow-hidden ${className}`} aria-hidden="true">
      <div className="flex w-max whitespace-nowrap lt-marquee" style={{ animationDuration: `${duration}s` }}>
        <span>{copy}</span>
        <span>{copy}</span>
      </div>
    </div>
  );
};

export default MarqueeStrip;

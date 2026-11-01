import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useEdit, useEditAttrs } from '../../services/editMode';
import { useStill } from '../../hooks/useA11yPrefs';
import ImagesService from '../../services/ImagesService';
import { FALLBACK_IMAGE_WIDE } from '../../utils/imageFallback';
import { altOf, type PortfolioItem } from '../../models/PortfolioItem';
import { coverBox, measureCurve, type CurveLayout } from './motion';

const TILE_SHARE = 0.38; // tile height, as a share of the band's height
const TILE_SHARE_PHONE = 0.5;
const ASPECT = 16 / 9;
const GAP = 0.06; // between tiles, as a share of a tile's height
const SPEED = 4.5; // seconds for the row to advance by one tile
const CURVE = 80; // how far round the band's edge sits, degrees
const CURVE_PHONE = 62;
// Strips per tile: each is a few degrees of arc, too little to read as a facet.
// An older phone gets fewer, and a slightly polygonal edge, for the same motion.
const SLICES = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency ?? 8) <= 4 ? 10 : 16;

const turn = (radius: number, deg: number): string =>
  `translateZ(${radius.toFixed(2)}px) rotateY(${deg.toFixed(3)}deg) translateZ(${(-radius).toFixed(2)}px)`;

/**
 * LT-525: 'curve' (the gallery style's own): one row of pictures streams round
 * the inside of a cylinder. The centre faces you flat, the ends bend toward you
 * and fade into the page. A CSS box cannot bend, so each tile is cut into
 * vertical strips, each a flat facet showing its share of the picture, and one
 * rotateY on the tile carries the strips along the arc. The band is
 * transform-only on the compositor; the only JS sizes the loop and hands a tile
 * its next picture as it wraps, out of sight. Sizes are in px, not container
 * units, for the older browsers Lightor's visitors bring.
 *
 * The band is drawn for the eye; screen readers get the list under it.
 */
const CurveReel: React.FC<{ items: PortfolioItem[] }> = ({ items }) => {
  const { t } = useLanguage();
  const { editing } = useEdit();
  const ed = useEditAttrs();
  const still = useStill();

  const ref = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<CurveLayout | null>(null);
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined');
  // The position in the run of pictures each tile shows; it changes only when
  // the tile wraps, out of sight, so a resize never swaps a picture on screen.
  const [shown, setShown] = useState<Record<number, number>>({});
  const [sizes, setSizes] = useState<Record<string, { src: string; w: number; h: number }>>({});

  const srcs = useMemo(() => items.map((i) => ImagesService.getInstance().getImage(i.url)), [items]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const { clientWidth: w, clientHeight: h } = el;
      const phone = w < 640;
      const next = measureCurve(w, h, phone ? TILE_SHARE_PHONE : TILE_SHARE, ASPECT, GAP, phone ? CURVE_PHONE : CURVE);
      setLayout((prev) => (prev && next && prev.tile === next.tile && prev.radius === next.radius ? prev : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Mounted when it comes near, and held still while off-screen.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setNear(true);
      el.toggleAttribute('data-asleep', !e.isIntersecting);
    }, { rootMargin: '240px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // A tile picks up its next picture just before it comes back into view, too
  // late to start loading it then. The natural size crops it like object-cover.
  useEffect(() => {
    if (!near) return;
    let live = true;
    for (const src of new Set(srcs)) {
      const img = new Image();
      img.onload = () => { if (live) setSizes((s) => ({ ...s, [src]: { src, w: img.naturalWidth, h: img.naturalHeight } })); };
      img.onerror = () => { if (live) setSizes((s) => ({ ...s, [src]: { src: FALLBACK_IMAGE_WIDE, w: 800, h: 600 } })); };
      img.src = src;
    }
    return () => { live = false; };
  }, [near, srcs]);

  const n = items.length;
  const tileH = layout?.tile ?? 0;
  const tileW = tileH * ASPECT;
  const strip = tileW / SLICES;
  const duration = (layout?.columns ?? 1) * SPEED;
  const mask = 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)';

  return (
    <div
      ref={ref}
      className="lt-curve relative overflow-hidden h-[clamp(15rem,42vw,34rem)]"
      data-still={still || editing ? '' : undefined}
    >
      {near && layout && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 ${editing ? '' : 'pointer-events-none'}`}
          style={{
            perspective: `${layout.camera.toFixed(2)}px`,
            maskImage: mask,
            WebkitMaskImage: mask,
            ['--lt-r' as string]: `${layout.radius.toFixed(2)}px`,
            ['--lt-sweep' as string]: `${layout.sweep.toFixed(3)}deg`,
          }}
        >
          {Array.from({ length: layout.columns }, (_, tile) => {
            // Tile `columns - 1` starts nearest the exit, in either direction, so
            // this numbers the tiles in the order they come on.
            const first = layout.columns - 1 - tile;
            const index = (shown[tile] ?? first) % n;
            const picture = sizes[srcs[index]];
            const box = picture ? coverBox(picture.w, picture.h, tileW, tileH) : null;
            return (
              <div
                key={tile}
                {...ed(`components.portfolio.items.${index}.url`, 'image')}
                className="lt-orbit absolute"
                style={{
                  left: `calc(50% - ${(tileW / 2).toFixed(2)}px)`,
                  top: `calc(50% - ${(tileH / 2).toFixed(2)}px)`,
                  width: tileW,
                  height: tileH,
                  transformStyle: 'preserve-3d',
                  animationDuration: `${duration}s`,
                  animationDelay: `${-tile * SPEED}s`,
                }}
                onAnimationIteration={(e) => {
                  // elapsedTime counts whole loops, missed events included.
                  const lap = Math.round(e.elapsedTime / duration);
                  const next = lap * layout.columns + first;
                  setShown((prev) => (prev[tile] === next ? prev : { ...prev, [tile]: next }));
                }}
              >
                {Array.from({ length: SLICES }, (__, k) => (
                  <div
                    key={k}
                    className={`absolute top-0 bg-light-gray dark:bg-dark-gray bg-no-repeat ${k === 0 ? 'rounded-l-design-card' : ''} ${k === SLICES - 1 ? 'rounded-r-design-card' : ''}`}
                    style={{
                      // Every strip starts at the tile's centre and is turned
                      // round the axis to its own place on the arc. A pixel
                      // wider than its share, so no hairline opens between them.
                      left: (tileW - strip) / 2,
                      width: k === SLICES - 1 ? strip : strip + 1,
                      height: tileH,
                      transform: turn(layout.radius, (ASPECT / 2 - ((k + 0.5) * ASPECT) / SLICES) * layout.unit),
                      backgroundImage: picture ? `url("${picture.src}")` : undefined,
                      backgroundSize: box ? `${box.w.toFixed(2)}px ${box.h.toFixed(2)}px` : undefined,
                      backgroundPosition: box ? `${(box.x - k * strip).toFixed(2)}px ${box.y.toFixed(2)}px` : undefined,
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
      <ul className="sr-only" aria-label={t('portfolio.grid_label')}>
        {items.map((item, i) => (
          <li key={i}>{[altOf(item), item.description].filter(Boolean).join(': ')}</li>
        ))}
      </ul>
    </div>
  );
};

export default CurveReel;

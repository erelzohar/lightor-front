import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useEdit } from '../../services/editMode';
import { useMotionDesignStill } from '../../services/planMotion';
import type { ProductCard } from '../../models/Product';
import { handleWideImageError } from '../../utils/imageFallback';
import { CoverImage, Price, SoldOut, useProductLink } from './ProductParts';
import { RAIL_ASPECT, RAIL_REST, clamp, fitRail, railTargets } from './motion';

const EASE = 'cubic-bezier(.22,.85,.3,1)';
const MOVE_MS = 520;
const AUTOPLAY_MS = 3200;
const HOOK = 'M100,36 L100,-0.4 C100,-3.4 102.2,-4.2 103.9,-2.8 C104.9,-2 105.4,-1.2 105.6,-0.2';
const BAR = 'M38,57 Q70,38 100,36 Q130,38 162,57';

const swing = (el: HTMLElement | null | undefined, degrees: number) => {
  if (!el || typeof el.animate !== 'function') return;
  el.animate(
    [0, 1, -0.65, 0.35, -0.15, 0].map((k) => ({ transform: `rotate(${(k * degrees).toFixed(2)}deg)` })),
    { duration: 1100, easing: 'ease-out' },
  );
};

/**
 * LT-540: 'hanger' (atelier's own, from Erel's clothes rail): products hang on a
 * rail, turned nearly edge-on, each with its price on a tag. A hand on one turns
 * it to face you and its neighbours swing out of its way; on a phone they come
 * one at a time. The moves are CSS transitions and one-off animations, so no
 * frame loop runs. His drawn garments stay out: the pictures are the owner's.
 */
const ProductRail: React.FC<{ items: ProductCard[]; pages: boolean; currency?: string }> = ({ items, pages, currency }) => {
  const { t, language } = useLanguage();
  const { editing } = useEdit();
  const still = useMotionDesignStill();
  const rtl = language === 'he' || language === 'ar';
  const linkOf = useProductLink(pages);
  const n = items.length;

  const stageRef = useRef<HTMLDivElement>(null);
  const swings = useRef<(HTMLSpanElement | null)[]>([]);
  const touched = useRef(false);
  const swipe = useRef<null | { id: number; x: number; y: number }>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [pick, setPick] = useState(0);
  const [inView, setInView] = useState(false);

  // Before the first measure (and with no layout at all) it stands as on a laptop.
  const stageW = width || 1024;
  const fit = useMemo(() => fitRail(stageW, n), [stageW, n]);
  const { h, carousel } = fit;
  const boxW = h * RAIL_ASPECT;
  const front = carousel ? (active ?? pick) : active;
  const xs = useMemo(() => railTargets(n, h, stageW, carousel, front), [n, h, stageW, carousel, front]);
  const railY = Math.round(h * 0.07) + 10;

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => setWidth(Math.round(stage.clientWidth));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(stage);
    return () => io.disconnect();
  }, []);

  const choose = (i: number | null) => {
    if (i === active) return;
    if (i !== null && !still) { swing(swings.current[i - 1], -2.4); swing(swings.current[i + 1], 2.4); }
    if (i !== null) setPick(i);
    setActive(i);
  };

  // One piece after another until a visitor takes over; never again after that.
  useEffect(() => {
    if (still || editing || !inView || touched.current || !width) return;
    const id = window.setTimeout(() => {
      if (!touched.current) choose(((active ?? -1) + 1) % n);
    }, active === null ? 1100 : AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, editing, inView, active, width, n]);

  const take = () => { touched.current = true; };

  const onPointerDown = (e: React.PointerEvent) => {
    take();
    swipe.current = carousel ? { id: e.pointerId, x: e.clientX, y: e.clientY } : null;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(e.clientY - s.y)) return;
    choose(clamp((front ?? 0) + ((dx < 0) !== rtl ? 1 : -1), 0, n - 1));
  };

  const shown = front === null ? null : items[front];

  return (
    <div data-testid="products-hanger">
      <div
        ref={stageRef}
        className="relative w-full touch-pan-y select-none"
        style={{ height: Math.round(railY + h * 1.02 + 16), overflowX: 'clip' }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse' && !carousel) choose(null); }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 rounded-full"
          style={{ top: railY - 4, height: 8, background: 'linear-gradient(to bottom, #d6d6da 0%, #ffffff 18%, #b5b5ba 40%, #8e8e94 62%, #66666b 100%)', boxShadow: '0 3px 6px rgba(0,0,0,.18)' }}
        />
        {items.map((product, i) => {
          const turned = front === i;
          const x = rtl ? stageW - xs[i] : xs[i];
          const angle = turned ? 0 : rtl ? -RAIL_REST : RAIL_REST;
          const link = linkOf(product);
          return (
            <a
              key={product.id}
              href={link.href}
              aria-label={product.name}
              draggable={false}
              className="absolute left-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2"
              style={{
                top: railY - (4 / 310) * h,
                width: boxW,
                height: h,
                zIndex: turned ? 30 : 10 + i,
                transform: `translate3d(${(x - boxW / 2).toFixed(1)}px,0,0)`,
                transition: still ? 'none' : `transform ${MOVE_MS}ms ${EASE}`,
              }}
              onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !carousel) { take(); choose(i); } }}
              onFocus={() => { take(); choose(i); }}
              onClick={(e) => {
                // A touch brings the piece forward first; the second opens it.
                if (!turned) { e.preventDefault(); choose(i); return; }
                link.onClick(e);
              }}
            >
              <span ref={(el) => { swings.current[i] = el; }} className="absolute inset-0 block" style={{ transformOrigin: '50% 1.3%' }}>
                <span
                  className="absolute inset-0 block"
                  style={{ transform: `perspective(1100px) rotateY(${angle}deg)`, transition: still ? 'none' : `transform ${MOVE_MS}ms ${EASE}` }}
                >
                  <svg aria-hidden="true" viewBox="0 0 200 310" preserveAspectRatio="xMidYMin meet" className="absolute inset-0 h-full w-full overflow-visible text-light-text/70 dark:text-dark-text/70">
                    <path d={BAR} fill="none" stroke="#9c6b43" strokeWidth="8.5" strokeLinecap="round" />
                    <path d={HOOK} fill="none" stroke="#c7c7cc" strokeWidth="2.6" strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-x-[6%] bottom-0 top-[13%] block overflow-hidden rounded-xl bg-light-surface shadow-card dark:bg-dark-surface">
                    <CoverImage product={product} eager onError={handleWideImageError} className="pointer-events-none" />
                    {product.soldOut && <SoldOut className="absolute top-2 start-2" />}
                  </span>
                </span>
                {product.price !== undefined && (
                  <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[10%]" style={{ transform: 'rotate(-10deg)', transformOrigin: 'top' }}>
                    <span className="mx-auto block h-3 w-px bg-light-text/40 dark:bg-dark-text/40" />
                    <span className="block whitespace-nowrap rounded-[3px] border border-black/10 bg-white px-1.5 py-1 text-[11px] font-semibold leading-none text-neutral-800 shadow">
                      <Price product={product} currency={currency} />
                    </span>
                  </span>
                )}
              </span>
            </a>
          );
        })}
      </div>

      {carousel && n > 1 && (
        <div className="mt-1 flex justify-center gap-1" role="group" aria-label={t('products.pick')}>
          {items.map((product, i) => (
            <button key={product.id} type="button" aria-label={product.name} aria-current={front === i || undefined} onClick={() => { take(); choose(i); }} className="flex h-6 w-6 items-center justify-center">
              <span className={`block h-1.5 rounded-full transition-all ${front === i ? 'w-5 bg-light-text dark:bg-dark-text' : 'w-1.5 bg-light-text/30 dark:bg-dark-text/30'}`} />
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 min-h-[3.5rem] text-center text-light-text dark:text-dark-text" aria-live="off">
        {shown && (<>
          <p className="font-semibold break-words">{shown.name}</p>
          {shown.summary && <p className="mx-auto mt-0.5 max-w-md text-sm text-light-text/70 dark:text-dark-text/70 break-words">{shown.summary}</p>}
        </>)}
      </div>
    </div>
  );
};

export default ProductRail;

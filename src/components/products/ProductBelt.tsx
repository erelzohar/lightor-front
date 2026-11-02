import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useEdit } from '../../services/editMode';
import { useStill } from '../../hooks/useA11yPrefs';
import type { ProductCard } from '../../models/Product';
import { CoverImage, Price, useProductLink } from './ProductParts';
import { beltFrames, edgePath, fitBelt, frontOf, lapsToFront, plateAtFront } from './motion';

/** Speed along the front lane, px/s. */
const SPEED = 26;
/** A lap's clock starts this many laps in, so a drag backwards never reaches its start. */
const START_LAPS = 1000;

/**
 * LT-540: 'belt' (festive's own, from Erel's sushi conveyor): products ride a
 * conveyor round and round. The plates move by transform animations the
 * compositor runs, so nothing here runs a frame loop and an old phone keeps its
 * scroll. It stops for a hand on it, a keyboard on it, off screen and in the
 * editor, the arrows and a drag move it, and the pause button stops it for good.
 * A product's picture sits in a round plate, whatever its shape.
 */
const ProductBelt: React.FC<{ items: ProductCard[]; pages: boolean; currency?: string }> = ({ items, pages, currency }) => {
  const { t, language } = useLanguage();
  const { editing } = useEdit();
  const still = useStill();
  const rtl = language === 'he' || language === 'ar';
  const linkOf = useProductLink(pages);
  const n = items.length;

  const stageRef = useRef<HTMLDivElement>(null);
  const plates = useRef<(HTMLAnchorElement | null)[]>([]);
  const anims = useRef<Animation[]>([]);
  const lapMs = useRef(1);
  const drag = useRef<null | { id: number; x: number; y: number; base: number; moved: boolean; lane: number }>(null);
  const dragged = useRef(false);

  const [width, setWidth] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [hold, setHold] = useState<number | null>(null);
  const [front, setFront] = useState(0);
  const [inView, setInView] = useState(true);

  const geo = useMemo(() => (width ? fitBelt(width, n) : null), [width, n]);
  const paths = useMemo(() => (geo ? { outer: edgePath(geo, geo.band / 2), inner: edgePath(geo, -geo.band / 2) } : null), [geo]);

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

  // One lap for every plate, each `i/n` of a lap behind the first.
  useLayoutEffect(() => {
    if (!geo) return;
    const frames = beltFrames(geo, rtl);
    const duration = (geo.l / SPEED) * 1000;
    lapMs.current = duration;
    const list: Animation[] = [];
    plates.current.slice(0, n).forEach((el, i) => {
      if (!el) return;
      const start = ((n - i) / n) % 1;
      // Where it stands with no animation at all (a test, the "still" setting's first frame).
      el.style.transform = frames[Math.round(start * (frames.length - 1))].transform;
      if (typeof el.animate !== 'function') return;
      const anim = el.animate(frames, { duration, iterations: Infinity, easing: 'linear', iterationStart: start });
      anim.pause();
      anim.currentTime = duration * START_LAPS;
      list.push(anim);
    });
    anims.current = list;
    return () => { list.forEach((a) => a.cancel()); anims.current = []; };
  }, [geo, n, rtl]);

  const running = !still && !editing && !stopped && inView && hold === null;
  useEffect(() => {
    for (const a of anims.current) {
      if (running) a.play();
      else a.pause();
    }
  }, [running, geo]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(stage);
    return () => io.disconnect();
  }, []);

  const phase = useCallback((): number => {
    const time = Number(anims.current[0]?.currentTime ?? 0);
    return (time / lapMs.current) % 1;
  }, []);

  // The caption follows the plate at the front; twice a second is plenty for a line of words.
  useEffect(() => {
    if (!running || !geo) return;
    const id = window.setInterval(() => setFront(plateAtFront(phase(), n, frontOf(geo))), 500);
    return () => window.clearInterval(id);
  }, [running, geo, n, phase]);

  const moveClock = (to: (from: number) => number, ms: number) => {
    const list = anims.current;
    if (!list.length) return;
    const from = Number(list[0].currentTime ?? 0);
    const target = to(from);
    if (still || ms === 0) { list.forEach((a) => { a.currentTime = target; }); return; }
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - (1 - p) ** 3;
      list.forEach((a) => { a.currentTime = from + (target - from) * eased; });
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const bringForward = (i: number) => {
    if (!geo) return;
    moveClock((from) => from + lapsToFront(phase(), i, n, frontOf(geo)) * lapMs.current, 420);
    setFront(i);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !geo) return;
    const box = stageRef.current?.getBoundingClientRect();
    const lane = box && e.clientY - box.top >= geo.ym ? 1 : -1;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, base: Number(anims.current[0]?.currentTime ?? 0), moved: false, lane };
    dragged.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !geo) return;
    const dx = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(e.clientY - d.y)) return;
      d.moved = true;
      dragged.current = true;
      setHold(-1);
      stageRef.current?.setPointerCapture(e.pointerId);
    }
    const perPixel = lapMs.current / geo.l;
    const clock = d.base - dx * d.lane * (rtl ? -1 : 1) * perPixel;
    anims.current.forEach((a) => { a.currentTime = clock; });
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    if (drag.current?.id !== e.pointerId) return;
    if (drag.current.moved) setHold(null);
    drag.current = null;
  };

  const shown = items[hold !== null && hold >= 0 ? hold : front] ?? items[0];
  const Prev = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;
  const control = 'inline-flex h-10 w-10 items-center justify-center rounded-full border border-light-text/20 dark:border-dark-text/20 text-light-text dark:text-dark-text hover:border-primary dark:hover:border-primary-dark transition-colors';
  const d = geo?.d ?? 110;

  return (
    <div data-testid="products-belt">
      <div
        ref={stageRef}
        className="relative w-full touch-pan-y select-none"
        style={{ height: geo ? geo.height : 260, overflowX: 'clip' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(e) => { if (dragged.current) { e.preventDefault(); e.stopPropagation(); dragged.current = false; } }}
      >
        {geo && paths && (
          <svg aria-hidden="true" focusable="false" className="pointer-events-none absolute left-0 top-0 overflow-visible" width={geo.width} height={geo.height} viewBox={`0 0 ${geo.width} ${geo.height}`}>
            <path d={`${paths.outer}${paths.inner}`} fillRule="evenodd" transform={`translate(0 ${geo.side.toFixed(1)})`} className="fill-current text-light-text/30 dark:text-dark-text/25" />
            <path d={`${paths.outer}${paths.inner}`} fillRule="evenodd" className="fill-current text-light-text/80 dark:text-dark-text/15" />
            <path d={paths.outer} fill="none" strokeWidth={Math.max(2, geo.d * 0.026)} className="stroke-current text-light-text/40 dark:text-dark-text/40" />
            <path d={paths.inner} fill="none" strokeWidth={Math.max(1.6, geo.d * 0.02)} className="stroke-current text-light-text/40 dark:text-dark-text/40" />
            <path d={paths.inner} className="fill-current text-light-text/5 dark:text-dark-text/5" />
          </svg>
        )}
        {items.map((product, i) => (
          <a
            key={product.id}
            ref={(el) => { plates.current[i] = el; }}
            {...linkOf(product)}
            aria-label={product.name}
            draggable={false}
            className="group absolute rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2"
            style={{ left: 0, top: 0, width: d, height: d, transformOrigin: '50% 50%' }}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') { setHold(i); } }}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHold(null); }}
            onFocus={() => { setHold(i); bringForward(i); }}
            onBlur={() => setHold(null)}
          >
            <span aria-hidden="true" className="absolute inset-x-[6%] bottom-[-5%] top-[12%] rounded-full bg-black/25" />
            <span className="absolute inset-0 overflow-hidden rounded-full border-4 border-white bg-light-surface dark:border-white/80 dark:bg-dark-surface transition-transform duration-300 group-hover:-translate-y-[6%] group-hover:scale-105">
              <CoverImage product={product} eager className="pointer-events-none" />
            </span>
          </a>
        ))}
      </div>

      <div className="mt-3 flex flex-col items-center gap-3 text-center">
        <div className="min-h-[3.5rem] max-w-md text-light-text dark:text-dark-text" aria-live="off">
          {shown && (<>
            <p className="font-semibold break-words">
              {shown.name} {shown.price !== undefined && <Price product={shown} currency={currency} className="font-normal text-light-text/75 dark:text-dark-text/75" />}
            </p>
            {shown.summary && <p className="mt-0.5 text-sm text-light-text/70 dark:text-dark-text/70 break-words">{shown.summary}</p>}
          </>)}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className={control} aria-label={t('products.previous')} onClick={() => bringForward((front - 1 + n) % n)}><Prev className="h-5 w-5" aria-hidden="true" /></button>
          <button type="button" className={control} aria-label={stopped ? t('products.play') : t('products.pause')} aria-pressed={stopped} onClick={() => setStopped((s) => !s)}>
            {stopped ? <Play className="h-5 w-5" aria-hidden="true" /> : <Pause className="h-5 w-5" aria-hidden="true" />}
          </button>
          <button type="button" className={control} aria-label={t('products.next')} onClick={() => bringForward((front + 1) % n)}><Next className="h-5 w-5" aria-hidden="true" /></button>
        </div>
      </div>
    </div>
  );
};

export default ProductBelt;

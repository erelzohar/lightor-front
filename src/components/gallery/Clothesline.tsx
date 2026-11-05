import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useEdit, useEditAttrs } from '../../services/editMode';
import { useStill } from '../../hooks/useA11yPrefs';
import ImagesService from '../../services/ImagesService';
import { handleSquareImageError } from '../../utils/imageFallback';
import { altOf, type PortfolioItem } from '../../models/PortfolioItem';
import { clamp, nearestAt, pad2, spring, stringY, swingStep } from './motion';

// Where the string is tied, and how fast the line follows a move.
const TIE_Y = 34;
const OMEGA = 8.4;
const AUTOPLAY_MS = 5000;

const sagOf = (w: number): number => Math.min(46, w * 0.06);

/**
 * LT-525: 'clothesline' (earthy's own): prints pegged to a sagging string. Drag
 * the line or use the arrows and they slide along it, swinging on their pegs
 * with the speed you give them; at rest a CSS sway keeps them in a light breeze,
 * so the frame loop runs only while something moves. It turns on its own until a
 * visitor takes hold of it. On right-to-left pages the line runs the other way.
 * The print frames stay white in dark mode, as the 'polaroid' layout's do.
 */
const Clothesline: React.FC<{ items: PortfolioItem[] }> = ({ items }) => {
  const { t, language } = useLanguage();
  const { editing } = useEdit();
  const ed = useEditAttrs();
  const still = useStill();
  const rtl = language === 'he' || language === 'ar';
  const displayFont = rtl ? 'var(--font-heading-rtl)' : 'var(--font-heading)';
  const dir = rtl ? -1 : 1;
  const n = items.length;

  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [box, setBox] = useState({ w: 1200, cw: 300, h: 520 });
  const spacing = box.cw * 1.08;

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  // Off React state, so a frame costs no render.
  const sim = useRef({ off: 0, vel: 0, target: 0, a: [] as number[], av: [] as number[] });
  const drag = useRef<null | { id: number; x: number; off: number; lx: number; lt: number; v: number; moved: boolean }>(null);
  const activeRef = useRef(0);
  const touched = useRef(false);
  const held = useRef(false);
  const seen = useRef(false);
  const kick = useRef<() => void>(() => {});

  const goTo = useCallback((i: number) => {
    sim.current.target = clamp(i, 0, n - 1) * spacing;
    kick.current();
  }, [n, spacing]);

  // A print is as tall as its caption wraps, and the stage as tall as the tallest print.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const w = stage.clientWidth;
      if (!w) return;
      const cw = Math.round(clamp(w * 0.62, 170, 300));
      const tallest = Math.max(0, ...cards.current.slice(0, n).map((el) => el?.offsetHeight ?? 0));
      const h = Math.round(TIE_Y + sagOf(w) + tallest + 32);
      setBox((b) => (b.w === w && b.cw === cw && b.h === h ? b : { w, cw, h }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    cards.current.slice(0, n).forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [n]);

  // The simulation, written straight to the DOM; it stops when everything rests.
  useLayoutEffect(() => {
    const S = sim.current;
    const { w, cw } = box;
    const sag = sagOf(w);
    let raf = 0;
    let prev = 0;
    const frame = (now: number) => {
      raf = 0;
      const dt = clamp((now - prev) / 1000, 0.001, 0.033);
      prev = now;
      const d = drag.current;
      let lineVel: number;
      if (d?.moved) {
        lineVel = d.v * 1000;
        d.v *= 0.9;
      } else if (still) {
        S.off = S.target;
        S.vel = 0;
        lineVel = 0;
      } else {
        const before = S.off;
        [S.off, S.vel] = spring(S.off, S.vel, S.target, OMEGA, 1, dt);
        lineVel = (-dir * (S.off - before)) / dt;
      }
      let calm = !d && Math.abs(S.off - S.target) < 0.3 && Math.abs(S.vel) < 2;
      const near = nearestAt(S.off, spacing, n);
      for (let i = 0; i < n; i++) {
        const el = cards.current[i];
        if (!el) continue;
        const x = w / 2 + dir * (i * spacing - S.off);
        if (x < -cw * 1.5 || x > w + cw * 1.5) {
          el.style.visibility = 'hidden';
          S.a[i] = S.av[i] = 0;
          continue;
        }
        el.style.visibility = 'visible';
        let a = S.a[i] ?? 0;
        let av = S.av[i] ?? 0;
        if (still) a = av = 0;
        // Each print takes it a little differently, or they swing as one.
        else [a, av] = swingStep(a, av, lineVel * (0.8 + 0.4 * Math.abs(Math.sin(i * 2.1))), dt);
        if (Math.abs(a) > 0.002 || Math.abs(av) > 0.02) calm = false;
        S.a[i] = a;
        S.av[i] = av;
        const y = stringY(x, w, TIE_Y, sag) - 6;
        el.style.transform = `translate(${(x - cw / 2).toFixed(1)}px, ${y.toFixed(1)}px) rotate(${a.toFixed(4)}rad)`;
        el.style.zIndex = String(i === near ? n + 1 : n - Math.abs(i - near));
      }
      if (near !== activeRef.current) {
        activeRef.current = near;
        setActive(near);
      }
      if (!calm) raf = requestAnimationFrame(frame);
    };
    kick.current = () => {
      if (raf) return;
      prev = performance.now();
      raf = requestAnimationFrame(frame);
    };
    pathRef.current?.setAttribute('d', `M0 ${TIE_Y} Q${w / 2} ${TIE_Y + 2 * sag} ${w} ${TIE_Y}`);
    // A resize keeps the print in front, and lays the line out before the first paint.
    S.off = S.target = Math.min(activeRef.current, Math.max(0, n - 1)) * spacing;
    S.vel = 0;
    prev = performance.now();
    frame(prev + 16);
    return () => cancelAnimationFrame(raf);
  }, [box, spacing, n, dir, still]);

  // The breeze and the autoplay wait while the stage is off-screen.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => {
      seen.current = e.isIntersecting;
      root.toggleAttribute('data-asleep', !e.isIntersecting);
    });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const playing = n > 1 && !still && !editing;
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      if (document.hidden || !seen.current || held.current || touched.current) return;
      goTo(activeRef.current >= n - 1 ? 0 : activeRef.current + 1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [playing, n, goTo]);

  const onDown = (e: React.PointerEvent) => {
    if (editing || (e.target as HTMLElement).closest('button')) return;
    touched.current = true;
    drag.current = { id: e.pointerId, x: e.clientX, off: sim.current.off, lx: e.clientX, lt: e.timeStamp, v: 0, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      setDragging(true);
      stageRef.current?.setPointerCapture?.(e.pointerId);
    }
    if (!d.moved) return;
    const dt = Math.max(1, e.timeStamp - d.lt);
    d.v = 0.7 * ((e.clientX - d.lx) / dt) + 0.3 * d.v;
    d.lx = e.clientX;
    d.lt = e.timeStamp;
    const max = (n - 1) * spacing;
    let off = d.off - dir * dx;
    if (off < 0) off *= 0.35;
    if (off > max) off = max + (off - max) * 0.35;
    sim.current.off = off;
    kick.current();
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (d.moved) {
      setDragging(false);
      sim.current.vel = -dir * d.v * 1000;
      goTo(nearestAt(sim.current.off - dir * d.v * 180, spacing, n));
    } else if (e.type === 'pointerup') {
      const card = (e.target as HTMLElement).closest('[data-i]');
      if (card) goTo(Number(card.getAttribute('data-i')));
    }
  };

  const step = (by: number) => {
    touched.current = true;
    goTo((activeRef.current + by + n) % n);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    step(e.key === 'ArrowRight' !== rtl ? 1 : -1);
  };

  const current = items[Math.min(active, n - 1)];
  const button = 'flex-none w-10 h-10 rounded-full grid place-items-center border border-light-text/20 dark:border-dark-text/20 text-light-text dark:text-dark-text transition-colors hover:bg-light-text hover:text-light-bg dark:hover:bg-dark-text dark:hover:text-dark-bg';

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={t('portfolio.slideshow_label')}
      tabIndex={0}
      onKeyDown={onKey}
      onFocus={() => { held.current = true; }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) held.current = false; }}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') held.current = true; }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') held.current = false; }}
    >
      <div
        ref={stageRef}
        className={`relative w-full overflow-hidden select-none touch-pan-y ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ height: box.h }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none text-light-text/50 dark:text-dark-text/50" aria-hidden="true">
          <path ref={pathRef} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {items.map((item, i) => (
          <div
            key={i}
            ref={(el) => { cards.current[i] = el; }}
            data-i={i}
            className="absolute top-0 left-0 origin-top will-change-transform"
            style={{ width: box.cw }}
            aria-hidden={i === active ? undefined : true}
          >
            <div className={still || editing ? 'origin-top' : 'lt-sway'} style={{ animationDelay: `${-i * 1.7}s` }}>
              <div className={`mt-2.5 bg-white px-2.5 pt-2.5 shadow-xl origin-top transition-transform duration-500 ${i === active ? '' : 'scale-90'}`}>
                <div className="aspect-square overflow-hidden bg-neutral-200">
                  <img
                    {...ed(`components.portfolio.items.${i}.url`, 'image')}
                    loading={Math.abs(i - active) <= 2 ? 'eager' : 'lazy'}
                    decoding="async"
                    draggable={false}
                    src={ImagesService.getInstance().getImage(item.url)}
                    alt={altOf(item)}
                    onError={handleSquareImageError}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p {...ed(`components.portfolio.items.${i}.title`)} className="min-h-[2.75rem] px-1 py-3 text-center leading-snug text-neutral-800" style={{ fontFamily: displayFont }}>
                  {item.title}
                </p>
              </div>
              <span className="lt-peg" aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>

      {/* The print carries the title (LT-582: a gallery picture has no more); under the line, where it is. */}
      <div className="max-w-2xl mx-auto px-4 mt-3 flex flex-wrap md:flex-nowrap items-center justify-center gap-3 md:gap-5">
        {n > 1 && (
          <>
            <span dir="ltr" className="flex-none font-mono text-xs tracking-widest text-light-text/70 dark:text-dark-text/70" aria-hidden="true">
              <b className="font-medium text-light-text dark:text-dark-text">{pad2(active + 1)}</b> / {pad2(n)}
            </span>
            <button type="button" className={button} aria-label={t('portfolio.slideshow_prev')} onClick={() => step(-1)}>
              <ChevronLeft className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            <button type="button" className={button} aria-label={t('portfolio.slideshow_next')} onClick={() => step(1)}>
              <ChevronRight className={`w-5 h-5 ${rtl ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <p className="sr-only" aria-live={playing ? 'off' : 'polite'}>
        {`${active + 1} / ${n}${current?.title ? `: ${current.title}` : ''}`}
      </p>
    </div>
  );
};

export default Clothesline;

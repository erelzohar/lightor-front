import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useEdit, useEditAttrs } from '../../services/editMode';
import { useMotionDesignStill } from '../../services/planMotion';
import ImagesService from '../../services/ImagesService';
import { handleSquareImageError } from '../../utils/imageFallback';
import { altOf, type PortfolioItem } from '../../models/PortfolioItem';
import { clamp, pad2, releaseTarget, rubber, scaleAt, spring } from './motion';

const ANGLE = 30; // degrees each step away from the front turns a card
const DROP = 0.5; // how far each step drops it, as a share of the card
const SMALL = 0.6; // the scale of every card not in front
const OMEGA = 7.85; // the springs: a move takes about 0.8 s…
const ZETA_SLIDE = 0.9; // …the slide is stiff…
const ZETA_TILT = 0.8; // …the tilt looser, and trailing it is the swing
const AUTOPLAY_MS = 3600;
const MAX_DOTS = 14;

/**
 * LT-525: 'cascade' (electric's own): square photos on a slanted line. The one
 * in front stands upright at full size; each one after it drops and turns one
 * way, each one before it climbs and turns the other, and on a move the whole
 * line slides while every card swings into place a moment behind it. One
 * position chased by two springs; frames go straight to the DOM and stop when
 * the springs settle. Right-to-left pages run the line the other way.
 */
const TiltCascade: React.FC<{ items: PortfolioItem[] }> = ({ items }) => {
  const { t, language } = useLanguage();
  const { editing } = useEdit();
  const ed = useEditAttrs();
  const still = useMotionDesignStill();
  const rtl = language === 'he' || language === 'ar';
  const displayFont = rtl ? 'var(--font-heading-rtl)' : 'var(--font-heading)';
  const dir = rtl ? -1 : 1;
  const n = items.length;
  const start = Math.floor((n - 1) / 2);

  const [active, setActive] = useState(start);
  const [dragging, setDragging] = useState(false);
  const [seen, setSeen] = useState(false);
  const [held, setHeld] = useState(false);
  const [touched, setTouched] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  // Off React state, so a frame costs no render.
  const E = useRef({
    a: start, va: 0, b: start, vb: 0, target: start, raf: 0, last: 0, clickBlock: false,
    drag: null as null | { id: number; x0: number; pos0: number; moved: boolean; samples: { t: number; x: number }[] },
  });
  const activeRef = useRef(start);

  const transformOf = useCallback((i: number, a: number, b: number) => {
    const dx = i - a;
    const d = i - b;
    return {
      transform: `translate3d(${(dir * dx * 100).toFixed(3)}%, ${(d * DROP * 100).toFixed(3)}%, 0) scale(${scaleAt(d, SMALL).toFixed(4)}) rotate(${(dir * d * ANGLE).toFixed(3)}deg)`,
      zIndex: 100 - Math.round(Math.abs(d) * 10),
      visibility: (Math.abs(dx) > 6.5 ? 'hidden' : 'visible') as 'hidden' | 'visible',
    };
  }, [dir]);

  const show = useCallback((i: number) => {
    if (i === activeRef.current) return;
    activeRef.current = i;
    setActive(i);
  }, []);

  const paint = useCallback(() => {
    const e = E.current;
    cards.current.forEach((el, i) => {
      if (!el) return;
      const s = transformOf(i, e.a, e.b);
      el.style.transform = s.transform;
      el.style.zIndex = String(s.zIndex);
      el.style.visibility = s.visibility;
    });
  }, [transformOf]);

  const kick = useCallback(() => {
    const e = E.current;
    const frame = (now: number) => {
      const dt = Math.min((now - (e.last || now)) / 1000, 0.05);
      e.last = now;
      if (still && !e.drag) {
        e.a = e.b = e.target;
        e.va = e.vb = 0;
      } else {
        // While dragging the line is under the finger and only the tilt chases it.
        if (!e.drag) [e.a, e.va] = spring(e.a, e.va, e.target, OMEGA, ZETA_SLIDE, dt);
        [e.b, e.vb] = spring(e.b, e.vb, e.a, OMEGA * 1.05, ZETA_TILT, dt);
      }
      paint();
      const settled = !e.drag && Math.abs(e.a - e.target) < 1e-3 && Math.abs(e.va) < 1e-2 && Math.abs(e.b - e.a) < 1e-3 && Math.abs(e.vb) < 1e-2;
      if (settled) {
        e.a = e.b = e.target;
        e.va = e.vb = 0;
        paint();
        e.raf = 0;
        e.last = 0;
        return;
      }
      e.raf = requestAnimationFrame(frame);
    };
    if (!e.raf) e.raf = requestAnimationFrame(frame);
  }, [paint, still]);

  const goTo = useCallback((i: number) => {
    const e = E.current;
    e.target = clamp(i, 0, n - 1);
    show(e.target);
    kick();
  }, [kick, n, show]);

  // A shorter list must not leave the position past its end.
  useEffect(() => {
    if (E.current.target > n - 1) goTo(n - 1);
    else paint();
  }, [n, goTo, paint]);

  useEffect(() => {
    const e = E.current;
    return () => cancelAnimationFrame(e.raf);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setSeen(entry.isIntersecting));
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const playing = n > 1 && !still && !editing && !touched;
  const rolling = playing && seen && !held && !dragging;
  useEffect(() => {
    if (!rolling) return;
    const id = window.setTimeout(() => {
      if (!document.hidden) goTo(E.current.target >= n - 1 ? 0 : E.current.target + 1);
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [rolling, active, n, goTo]);

  const onDown = (e: React.PointerEvent) => {
    if (editing || e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    E.current.drag = { id: e.pointerId, x0: e.clientX, pos0: E.current.a, moved: false, samples: [{ t: e.timeStamp, x: e.clientX }] };
  };
  const onMove = (e: React.PointerEvent) => {
    const s = E.current;
    const d = s.drag;
    if (!d || d.id !== e.pointerId) return;
    const size = stageRef.current?.offsetWidth || 300;
    if (!d.moved) {
      if (Math.abs(e.clientX - d.x0) < 6) return;
      d.moved = true;
      d.x0 = e.clientX;
      d.pos0 = s.a;
      s.va = 0;
      rootRef.current?.setPointerCapture?.(e.pointerId);
      setDragging(true);
      setTouched(true);
    }
    s.a = rubber(d.pos0 - (dir * (e.clientX - d.x0)) / size, n);
    d.samples.push({ t: e.timeStamp, x: e.clientX });
    if (d.samples.length > 6) d.samples.shift();
    show(clamp(Math.round(s.a), 0, n - 1));
    kick();
  };
  const onUp = (e: React.PointerEvent) => {
    const s = E.current;
    const d = s.drag;
    if (!d || d.id !== e.pointerId) return;
    s.drag = null;
    if (!d.moved) return;
    setDragging(false);
    s.clickBlock = true;
    window.setTimeout(() => { s.clickBlock = false; }, 0);
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const size = stageRef.current?.offsetWidth || 300;
    // px per ms into slides per second, against the drag's direction.
    const v = e.type === 'pointercancel' ? 0 : ((-dir * (last.x - first.x)) / Math.max(last.t - first.t, 1) / size) * 1000;
    s.va = v;
    goTo(releaseTarget(s.a, v, n));
  };

  const by = (step: number) => {
    setTouched(true);
    goTo(E.current.target + step);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    by(e.key === 'ArrowRight' !== rtl ? 1 : -1);
  };
  const pick = (i: number) => {
    if (E.current.clickBlock) return;
    setTouched(true);
    goTo(i);
  };

  const current = items[Math.min(active, n - 1)];
  const button = 'grid place-items-center p-2 rounded-full text-light-text dark:text-dark-text transition-opacity disabled:opacity-30';

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={t('portfolio.slideshow_label')}
      tabIndex={0}
      className={`relative overflow-hidden select-none touch-pan-y pt-[calc(var(--lt-s)*0.2)] md:pt-[calc(var(--lt-s)*0.46)] pb-2 [mask-image:linear-gradient(to_bottom,transparent,#000_2.5rem)] ${dragging ? 'cursor-grabbing' : ''}`}
      style={{ ['--lt-s' as string]: 'clamp(11rem, 62vw, 19rem)' }}
      onKeyDown={onKey}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHeld(true); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHeld(false); }}
      onFocus={() => setHeld(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false); }}
    >
      <div ref={stageRef} className="relative mx-auto aspect-square w-[var(--lt-s)]">
        {items.map((item, i) => (
          <div
            key={i}
            ref={(el) => { cards.current[i] = el; }}
            className={`absolute inset-0 will-change-transform ${i === active ? '' : 'cursor-pointer'}`}
            style={transformOf(i, start, start)}
            aria-hidden={i === active ? undefined : true}
            onClick={() => pick(i)}
          >
            <div className="absolute inset-0 overflow-hidden rounded-design-card shadow-card bg-light-gray dark:bg-dark-gray">
              <img
                {...ed(`components.portfolio.items.${i}.url`, 'image')}
                loading={Math.abs(i - active) <= 3 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
                src={ImagesService.getInstance().getImage(item.url)}
                alt={altOf(item)}
                onError={handleSquareImageError}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ))}
      </div>

      <div key={active} className="relative z-[200] lt-cap-in mx-auto mt-6 w-[var(--lt-s)] min-h-[3.5rem] text-center text-light-text dark:text-dark-text" aria-hidden="true">
        {current?.title && <h3 {...ed(`components.portfolio.items.${active}.title`)} className="text-xl md:text-2xl font-bold leading-snug" style={{ fontFamily: displayFont }}>{current.title}</h3>}
        {current?.description && <p {...ed(`components.portfolio.items.${active}.description`)} className="mt-1 text-sm text-light-text/70 dark:text-dark-text/70">{current.description}</p>}
      </div>

      {n > 1 && (
        <div className="relative z-[200] mt-6 mx-auto w-max flex items-center gap-3 px-2 rounded-full border border-light-text/15 dark:border-dark-text/15 bg-light-surface dark:bg-dark-surface">
          <button type="button" className={button} aria-label={t('portfolio.slideshow_prev')} disabled={active <= 0} onClick={() => by(-1)}>
            <ChevronLeft className={`w-6 h-6 ${rtl ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {n > MAX_DOTS ? (
            <span dir="ltr" className="font-mono text-sm tabular-nums text-light-text dark:text-dark-text">{pad2(active + 1)} / {pad2(n)}</span>
          ) : (
            <div className="flex items-center justify-center gap-2 min-w-[6rem]">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`lt-dot h-2 rounded-full transition-[width,opacity] duration-300 bg-primary dark:bg-primary-dark ${i === active ? 'w-7' : 'w-2 opacity-40'}`}
                  aria-label={t('portfolio.slideshow_dot', { index: i + 1 })}
                  aria-current={i === active ? 'true' : undefined}
                  onClick={() => pick(i)}
                />
              ))}
            </div>
          )}
          <button type="button" className={button} aria-label={t('portfolio.slideshow_next')} disabled={active >= n - 1} onClick={() => by(1)}>
            <ChevronRight className={`w-6 h-6 ${rtl ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
      )}

      <p className="sr-only" aria-live={playing ? 'off' : 'polite'}>
        {`${active + 1} / ${n}: ${[current?.title, current?.description].filter(Boolean).join(': ')}`}
      </p>
    </div>
  );
};

export default TiltCascade;

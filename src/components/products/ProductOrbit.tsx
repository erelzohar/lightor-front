import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ShoppingBag, Tag } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useEdit } from '../../services/editMode';
import { useStill } from '../../hooks/useA11yPrefs';
import type { ProductCard } from '../../models/Product';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG, displayFontFor } from '../blocks/blockUtils';
import { altOfImage, imageUrl, Price, SoldOut, useProductLink } from './ProductParts';
import { handleSquareImageError } from '../../utils/imageFallback';
import { ORBIT_PIVOT, lineSize, orbitArc, orbitTurn, twoLines } from './motion';

const AUTOPLAY_MS = 5200;
/** Degrees a plate travels round its pivot on the way out, and in: low enough to pass under the section's heading. */
const SWING = 36;
const OUT = 'cubic-bezier(.55,0,.75,.2)';
const IN = 'cubic-bezier(.2,.8,.25,1)';
/** The thin line wipes in from the end side, the heavy one from the start side (mirrored on RTL pages). */
const SHOW = 'inset(0% 0% 0% 0%)';
const FROM_RIGHT = 'inset(0% 0% 0% 100%)';
const FROM_LEFT = 'inset(0% 100% 0% 0%)';
/** How strong the band is behind each product: it breathes a little with the turn. */
const BAND = [0.16, 0.22, 0.13, 0.2, 0.18];

type Animated = HTMLElement | null | undefined;

/**
 * LT-583: 'orbit' (serene's own, from Erel's dish carousel). The product's
 * picture sits on a round plate; a change swings it out on a wide orbit while
 * the next swings in from the far side, its name wipes out and back in (a thin
 * line and a heavy one), the card beside it cross-fades and the pastel band
 * behind turns. Rebuilt without the reference's scroll pinning (the page keeps
 * its own scroll) and without a frame loop: browser animations on transform,
 * opacity and a clip, a few seconds each, and nothing at all at rest. It turns
 * by itself every few seconds while in view, until a visitor touches it, and
 * then never again; still and editing stop it.
 */
const ProductOrbit: React.FC<{ items: ProductCard[]; pages: boolean; currency?: string; tone?: SectionTone; cta?: string }> = ({ items, pages, currency, tone = 'bg', cta }) => {
  const { t, language } = useLanguage();
  const { editing } = useEdit();
  const still = useStill();
  const rtl = language === 'he' || language === 'ar';
  const linkOf = useProductLink(pages);
  const n = items.length;

  const rootRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const plates = useRef<Animated[]>([]);
  const heads = useRef<Animated[]>([]);
  const cards = useRef<Animated[]>([]);
  const thumbs = useRef<Animated[]>([]);
  const running = useRef<Animation[]>([]);
  const shown = useRef(0);
  const way = useRef<1 | -1>(1);
  const swipe = useRef<null | { id: number; x: number; y: number }>(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [touched, setTouched] = useState(false);
  const touchedRef = useRef(false);

  const touch = () => {
    if (touchedRef.current) return;
    touchedRef.current = true;
    setTouched(true);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (still || editing || !inView || touched || n < 2) return;
    const id = window.setInterval(() => {
      if (touchedRef.current) return;
      way.current = 1;
      setActive((a) => (a + 1) % n);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [still, editing, inView, touched, n]);

  // The swap. Every product is on the page; the browser animates only the outgoing one and the incoming.
  useLayoutEffect(() => {
    const from = shown.current;
    const to = n ? active % n : 0;
    shown.current = to;
    running.current.forEach((a) => a.cancel());
    running.current = [];
    if (from === to || from >= n || still) return;
    const play = (el: Animated | Element | null | undefined, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      if (!el || typeof (el as HTMLElement).animate !== 'function') return;
      running.current.push((el as HTMLElement).animate(keyframes, options));
    };
    // On a right-to-left page the plate sits on the right and everything swings the mirrored way.
    const d = way.current * (rtl ? -1 : 1);
    play(plates.current[from], [{ transform: 'rotate(0deg)', opacity: 1 }, { opacity: 1, offset: 0.55 }, { transform: `rotate(${SWING * d}deg)`, opacity: 0 }], { duration: 620, easing: OUT });
    play(plates.current[to], [{ transform: `rotate(${-SWING * d}deg)`, opacity: 0 }, { opacity: 1, offset: 0.35 }, { transform: 'rotate(0deg)', opacity: 1 }], { duration: 950, delay: 300, easing: IN, fill: 'backwards' });
    const [out1, out2] = rtl ? [FROM_LEFT, FROM_RIGHT] : [FROM_RIGHT, FROM_LEFT];
    const head = heads.current[from];
    play(head, [{ opacity: 1 }, { opacity: 1 }], { duration: 520 });
    play(head?.querySelector('[data-line="1"]'), [{ clipPath: SHOW }, { clipPath: out1 }], { duration: 420, easing: OUT, fill: 'forwards' });
    play(head?.querySelector('[data-line="2"]'), [{ clipPath: SHOW }, { clipPath: out2 }], { duration: 420, delay: 60, easing: OUT, fill: 'both' });
    play(head?.querySelector('[data-line="0"]'), [{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' });
    const next = heads.current[to];
    play(next?.querySelector('[data-line="0"]'), [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 400, delay: 550, easing: IN, fill: 'backwards' });
    play(next?.querySelector('[data-line="1"]'), [{ clipPath: out1 }, { clipPath: SHOW }], { duration: 700, delay: 550, easing: IN, fill: 'backwards' });
    play(next?.querySelector('[data-line="2"]'), [{ clipPath: out2 }, { clipPath: SHOW }], { duration: 700, delay: 620, easing: IN, fill: 'backwards' });
    play(cards.current[from], [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 300, delay: 50, easing: OUT, fill: 'backwards' });
    Array.from(cards.current[to]?.children ?? []).forEach((child, i) => {
      play(child, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 400 + i * 60, easing: IN, fill: 'backwards' });
    });
  }, [active, n, still, rtl]);

  useEffect(() => () => running.current.forEach((a) => a.cancel()), []);

  // The thumbnail of the product shown stays in view inside its strip; the page itself never moves.
  useEffect(() => {
    const strip = stripRef.current;
    const thumb = thumbs.current[n ? active % n : 0];
    if (!strip || !thumb || typeof strip.scrollBy !== 'function') return;
    const s = strip.getBoundingClientRect();
    const r = thumb.getBoundingClientRect();
    const by = r.left < s.left ? r.left - s.left - 12 : r.right > s.right ? r.right - s.right + 12 : 0;
    if (by) strip.scrollBy({ left: by, behavior: still ? 'auto' : 'smooth' });
  }, [active, n, still]);

  if (!n) return null;
  // The list can shrink under it in the editor.
  const at = active % n;

  const go = (to: number, by?: 1 | -1) => {
    touch();
    const next = ((to % n) + n) % n;
    if (next === at) return;
    way.current = by ?? (next > at ? 1 : -1);
    setActive(next);
  };
  const step = (by: 1 | -1) => go(at + by, by);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    step((e.key === 'ArrowRight') !== rtl ? 1 : -1);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    touch();
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) >= 40 && Math.abs(dx) >= Math.abs(e.clientY - s.y) * 1.3) step((dx < 0) !== rtl ? 1 : -1);
  };

  const Prev = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;
  const font = displayFontFor(language);
  const card = tone === 'surface' ? TONE_BG.bg : TONE_BG.surface;
  const hidden = (i: number) => (i === at ? undefined : true);
  const showing = (i: number): React.CSSProperties => (i === at ? {} : { opacity: 0, pointerEvents: 'none' });
  const px = rtl ? 100 - ORBIT_PIVOT.x : ORBIT_PIVOT.x;
  const pivot = `${px}% ${ORBIT_PIVOT.y}%`;
  // The band is drawn round the pivot (0,0), in % of the plate; its box covers
  // it at every turn, placed so that the pivot lands where the plates hang from.
  const box = { x: rtl ? -255 : -190, y: 115, w: 445, h: 180 };
  const arrow = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-light-text/15 dark:border-dark-text/15 text-light-text dark:text-dark-text hover:border-primary dark:hover:border-primary-dark transition-colors';

  return (
    <div
      ref={rootRef}
      data-testid="products-orbit"
      role="group"
      aria-roledescription="carousel"
      aria-label={t('products.pick')}
      // The section clips it at the screen's edges (Products), so the band and a swinging
      // plate run off them instead of stopping short; the room on top keeps the band off the heading.
      className="relative mx-auto w-full max-w-6xl pt-6"
      onKeyDown={onKeyDown}
      onFocusCapture={touch}
    >
      <div className="relative grid items-center gap-8 md:grid-cols-[auto_minmax(0,1fr)] md:gap-x-12 lg:grid-cols-[auto_minmax(0,1fr)_17rem] lg:gap-x-14">
        <div
          className="relative mx-auto h-[min(64vw,16rem)] w-[min(64vw,16rem)] touch-pan-y select-none md:row-span-2 md:mx-0 md:h-72 md:w-72 lg:row-span-1 lg:h-80 lg:w-80"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { swipe.current = null; }}
        >
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute text-primary dark:text-primary-dark"
            style={{ left: `${box.x + px}%`, top: `${box.y + ORBIT_PIVOT.y}%`, width: `${box.w}%`, height: `${box.h}%`, overflow: 'visible' }}
            viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
          >
            <g style={{ transform: `rotate(${(rtl ? -1 : 1) * orbitTurn(at)}deg)`, transition: still ? undefined : 'transform 1.1s cubic-bezier(.3,.7,.2,1)' }}>
              <path d={orbitArc(rtl)} fill="currentColor" style={{ opacity: BAND[at % BAND.length], transition: still ? undefined : 'opacity .9s ease' }} />
            </g>
          </svg>
          {items.map((product, i) => {
            const link = linkOf(product);
            const image = product.images[0];
            return (
              <div key={product.id} ref={(el) => { plates.current[i] = el; }} className="absolute inset-0" style={{ transformOrigin: pivot, ...showing(i) }} aria-hidden={hidden(i)}>
                <a
                  href={link.href}
                  onClick={link.onClick}
                  tabIndex={-1}
                  draggable={false}
                  aria-label={product.name}
                  className="block h-full w-full rounded-full bg-light-surface p-[5%] dark:bg-dark-surface"
                  style={{ boxShadow: '0 26px 44px -22px rgba(0,0,0,.55), 0 4px 10px -4px rgba(0,0,0,.18)' }}
                >
                  {image ? (
                    <img src={imageUrl(image)} alt={altOfImage(product, image)} loading={i === 0 ? 'eager' : 'lazy'} draggable={false} onError={handleSquareImageError} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center rounded-full bg-light-bg text-light-text/30 dark:bg-dark-bg dark:text-dark-text/30"><ShoppingBag className="h-1/3 w-1/3" aria-hidden="true" /></span>
                  )}
                </a>
                {product.soldOut && <SoldOut className="absolute start-1/2 top-[6%] -translate-x-1/2 rtl:translate-x-1/2" />}
              </div>
            );
          })}
        </div>

        <div className="relative grid text-center md:text-start">
          {items.map((product, i) => {
            const [thin, heavy] = twoLines(product.name);
            return (
              <div key={product.id} ref={(el) => { heads.current[i] = el; }} className="[grid-area:1/1]" style={showing(i)} aria-hidden={hidden(i)}>
                <p data-line="0" className="m-0 mb-2 text-sm font-semibold text-primary-readable dark:text-primary-dark-readable">
                  {product.category ?? <span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums' }}>{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>}
                </p>
                <h3 className="m-0 text-light-text dark:text-dark-text" style={{ fontFamily: font }}>
                  {thin && (
                    <span data-line="1" className="block font-extralight uppercase leading-[1.05] tracking-tight break-words" style={{ fontSize: `${lineSize(thin, 3.1, 1.7, 30)}rem` }}>{thin}</span>
                  )}
                  <span data-line="2" className="mt-1 block font-extrabold uppercase leading-[1.05] tracking-tight break-words" style={{ fontSize: `${lineSize(heavy, 3.6, 1.9, 27)}rem` }}>{heavy}</span>
                </h3>
              </div>
            );
          })}
        </div>

        <div className="relative grid md:col-start-2 lg:col-start-3 lg:row-start-1">
          {items.map((product, i) => {
            const link = linkOf(product);
            const current = i === at;
            return (
              <div
                key={product.id}
                ref={(el) => { cards.current[i] = el; }}
                className={`[grid-area:1/1] flex flex-col gap-4 rounded-design-card p-6 shadow-card ${card}`}
                style={showing(i)}
                aria-hidden={hidden(i)}
              >
                {product.price !== undefined && (
                  <div className="flex items-end gap-3">
                    <span aria-hidden="true" className="flex h-14 w-10 shrink-0 items-end justify-center rounded-design-sm bg-primary pb-2 text-on-primary dark:bg-primary-dark dark:text-on-primary-dark"><Tag className="h-3.5 w-3.5" /></span>
                    <Price product={product} currency={currency} className="text-3xl font-bold leading-none text-light-text dark:text-dark-text" />
                  </div>
                )}
                {product.summary && <p className="m-0 text-light-text/80 dark:text-dark-text/80 break-words">{product.summary}</p>}
                <a
                  href={link.href}
                  onClick={link.onClick}
                  tabIndex={current ? 0 : -1}
                  className="inline-flex items-center justify-center gap-2 self-center rounded-design bg-primary px-6 py-3 font-bold text-on-primary transition-opacity hover:opacity-90 dark:bg-primary-dark dark:text-on-primary-dark md:self-start"
                >
                  {pages ? t('products.more') : cta?.trim() || t('products.cta')}
                  <span className="sr-only">: {product.name}</span>
                </a>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-10 flex items-center gap-2 md:gap-3">
        <button type="button" className={arrow} aria-label={t('products.previous')} onClick={() => step(-1)}><Prev className="h-5 w-5" aria-hidden="true" /></button>
        <div ref={stripRef} className="min-w-0 flex-1 overflow-x-auto py-2" style={{ scrollbarWidth: 'none' }}>
          <ul className="mx-auto my-0 flex w-max list-none gap-2 p-0">
            {items.map((product, i) => {
              const image = product.images[0];
              const current = i === at;
              return (
                <li key={product.id} ref={(el) => { thumbs.current[i] = el; }}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={current || undefined}
                    aria-label={product.name}
                    className={`flex w-24 flex-col items-center gap-2 rounded-design-card px-1 pb-2 pt-3 transition-colors ${current ? `${card} shadow-card` : 'hover:bg-light-text/5 dark:hover:bg-dark-text/5'}`}
                  >
                    <span className={`block h-14 w-14 overflow-hidden rounded-full bg-light-surface dark:bg-dark-surface transition-transform duration-500 ${current ? 'scale-105' : ''}`}>
                      {image ? <img src={imageUrl(image)} alt="" loading="lazy" draggable={false} onError={handleSquareImageError} className="h-full w-full object-cover" /> : <ShoppingBag className="m-auto mt-4 h-6 w-6 text-light-text/30 dark:text-dark-text/30" aria-hidden="true" />}
                    </span>
                    <span aria-hidden="true" className="block text-center text-xs font-medium leading-tight text-light-text/80 dark:text-dark-text/80 break-words">{product.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <button type="button" className={arrow} aria-label={t('products.next')} onClick={() => step(1)}><Next className="h-5 w-5" aria-hidden="true" /></button>
      </div>
      <p className="sr-only" aria-live={touched ? 'polite' : 'off'}>{`${items[at].name} (${at + 1}/${n})`}</p>
    </div>
  );
};

export default ProductOrbit;

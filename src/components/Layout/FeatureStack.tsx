import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useEdit, useEditAttrs } from '../../services/editMode';
import { useStill } from '../../hooks/useA11yPrefs';
import ImagesService from '../../services/ImagesService';

export interface StackFeature { title: string; description: string; image?: string }

/** A shape the picture shows through, in % of the square: x, y, width, height, corner radius. */
type Tile = [number, number, number, number, string];

/**
 * The three masks of Erel's reference (its SVG clip paths, measured in % of
 * its 500 square): stacked bars, a bento of panes, a grid of nine squares.
 * Each highlight shows its picture through the next one in turn.
 */
export const MASKS: Tile[][] = [
  [[8.2, 15, 83.7, 24.2, '40% 40% 6px 6px'], [1.7, 40.9, 96.6, 6.1, '6px'], [1.7, 48.5, 96.6, 18.7, '14px'], [1.7, 68.8, 96.6, 3.7, '6px'], [8.2, 74, 83.7, 11, '6px 6px 18px 18px']],
  [[4, 4, 40, 56, '12px'], [4, 64, 40, 32, '12px'], [48, 4, 48, 28, '12px'], [48, 36, 22, 32, '12px'], [74, 36, 22, 32, '12px'], [48, 72, 48, 24, '12px']],
  Array.from({ length: 9 }, (_, i): Tile => [(i % 3) * 32 + 4, Math.floor(i / 3) * 32 + 4, 28, 28, '4px']),
];

/** The order the shapes come in: scattered, the same for the same change. */
export const scatter = (count: number, seed: number): number[] => {
  const order = Array.from({ length: count }, (_, i) => i);
  let s = (seed * 9301 + 49297) % 233280;
  for (let i = order.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
};

const AUTOPLAY_MS = 4500;

/**
 * LT-588 'stack' (electric's own, from Erel's "connoisseur stack"): the
 * highlights as a numbered list of large names, and beside them the chosen
 * one's picture, seen through a shaped mask whose pieces pop in one after
 * another when it changes. Rebuilt without gsap and without the reference's
 * endless breathing loop: each change is one short browser animation on
 * transforms, then nothing moves. It moves to the next highlight by itself
 * every few seconds while in view (a paid design), until a visitor touches
 * it, then never again; still and editing stop it. A highlight's own picture
 * if it has one, else the site's pictures in turn.
 */
const FeatureStack: React.FC<{ features: StackFeature[]; pictures: string[]; tone?: 'bg' | 'surface' }> = ({ features, pictures }) => {
  const { language } = useLanguage();
  const { editing } = useEdit();
  const ed = useEditAttrs();
  const still = useStill();
  const rtl = language === 'he' || language === 'ar';
  const n = features.length;
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [inView, setInView] = useState(false);
  const touched = useRef(false);
  const [stopped, setStopped] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef(0);

  const pictureOf = (i: number): string | undefined => {
    const own = features[i]?.image;
    const src = own || (pictures.length ? pictures[i % pictures.length] : undefined);
    return src ? ImagesService.getInstance().getImage(src) : undefined;
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (still || editing || !inView || stopped || n < 2) return;
    const id = window.setInterval(() => { if (!touched.current) setActive((a) => (a + 1) % n); }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [still, editing, inView, stopped, n]);

  // The change: the new shapes pop in, scattered; the old picture leaves under them.
  useLayoutEffect(() => {
    const from = shownRef.current;
    shownRef.current = active;
    if (from === active || still) { setLeaving(null); return; }
    setLeaving(from);
    const tiles = Array.from(tilesRef.current?.querySelectorAll<HTMLElement>('[data-tile]') ?? []);
    const order = scatter(tiles.length, active + 1);
    const running = tiles.flatMap((tile, i) => (typeof tile.animate === 'function'
      ? [tile.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 800, delay: 80 + order[i] * 70, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' })]
      : []));
    const done = window.setTimeout(() => setLeaving(null), 80 + tiles.length * 70 + 800);
    return () => { window.clearTimeout(done); running.forEach((a) => a.cancel()); };
  }, [active, still]);

  if (!n) return null;
  const at = active % n;
  const touch = () => { if (!touched.current) { touched.current = true; setStopped(true); } };
  const pick = (i: number) => { touch(); setActive(i); };
  const mask = MASKS[at % MASKS.length];
  const picture = pictureOf(at);
  const old = leaving !== null ? pictureOf(leaving) : undefined;

  return (
    <div ref={rootRef} className="mb-20 grid items-center gap-12 md:grid-cols-2 md:gap-16" data-testid="features-stack" onPointerDown={touch} onFocusCapture={touch}>
      <ol className="m-0 flex list-none flex-col gap-8 p-0 md:gap-12">
        {features.map((feature, i) => {
          const on = i === at;
          return (
            <li key={i}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => pick(i)}
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') pick(i); }}
                className="group flex w-full items-start gap-5 text-start"
              >
                <span aria-hidden="true" className={`mt-1 text-2xl font-bold tabular-nums transition-[transform,color] duration-500 md:text-3xl ${on ? 'scale-110 text-primary-readable dark:text-primary-dark-readable' : 'text-light-text/40 dark:text-dark-text/40'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={`min-w-0 transition-[transform,opacity] duration-700 ${on ? `opacity-100 ${rtl ? '-translate-x-3' : 'translate-x-3'}` : 'opacity-40'}`}>
                  <span {...ed(`components.about.features.${i}.title`)} className="block text-4xl font-black uppercase leading-[0.9] tracking-tighter text-light-text break-words dark:text-dark-text md:text-5xl">{feature.title}</span>
                  {/* The words of the chosen one, under its name (the reference had names only). */}
                  <span {...ed(`components.about.features.${i}.description`)} className={`mt-3 block text-base leading-relaxed text-light-text/75 dark:text-dark-text/75 ${on ? '' : 'sr-only'}`}>{feature.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="relative mx-auto aspect-square w-full max-w-[500px]">
        <span aria-hidden="true" className="absolute -inset-[10%] rounded-full" style={{ background: 'radial-gradient(circle, rgb(var(--color-primary) / .16), transparent 65%)' }} />
        {old && <img src={old} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full rounded-3xl object-cover opacity-30" />}
        <div ref={tilesRef} key={at} className="absolute inset-0" {...ed(`components.about.features.${at}.image`, 'image')} role="img" aria-label={features[at].title}>
          {mask.map(([x, y, w, h, r], i) => (
            <div key={i} data-tile className="absolute overflow-hidden bg-primary/15 shadow-xl dark:bg-primary-dark/20" style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, borderRadius: r, transformOrigin: '50% 50%' }}>
              {picture && (
                <img src={picture} alt="" draggable={false} className="absolute max-w-none object-cover" style={{ width: `${(100 / w) * 100}%`, height: `${(100 / h) * 100}%`, left: `${(-x / w) * 100}%`, top: `${(-y / h) * 100}%` }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeatureStack;

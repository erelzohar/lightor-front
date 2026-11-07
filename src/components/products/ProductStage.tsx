import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Share2, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStill } from '../../hooks/useA11yPrefs';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useEdit } from '../../services/editMode';
import { followLink, useSiteNav } from '../../services/siteNav';
import ImagesService from '../../services/ImagesService';
import { useCutout } from '../../utils/cutout';
import { handleSquareImageError } from '../../utils/imageFallback';
import type { ProductImage } from '../../models/Product';
import { Price, ProductActions, SoldOut, altOfImage, imageUrl, type ProductLookProps } from './ProductParts';
import './ProductStage.css';

const rgba = (hex: string, alpha: number): string => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return Number.isNaN(n) ? 'transparent' : `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/** A colour's wash: a light tint over the whole look, and a bright pool on the stage where the product floats. */
export const washOf = (hex: string): string => rgba(hex, 0.15);
export const poolOf = (hex: string): string => `radial-gradient(50% 55% at 50% 45%, ${rgba(hex, 0.45)}, transparent 72%)`;

/** The huge word's size: as large as the stage lets it be, whatever its length (it is never cut). */
export const wordSize = (stage: number, text: string): number => Math.max(32, Math.min(150, stage / Math.max(4, text.length * 0.62)));

const swap: Variants = {
  enter: (d: number) => ({ y: `${130 * d}%`, rotate: 9 * d, opacity: 0 }),
  center: { y: '0%', rotate: 0, opacity: 1, transition: { duration: 0.7, ease: [0.34, 1.3, 0.64, 1], delay: 0.06 } },
  exit: (d: number) => ({ y: `${-130 * d}%`, rotate: -7 * d, opacity: 0, transition: { duration: 0.45, ease: 'easeIn' } }),
};
const slide: Variants = {
  enter: { y: '70%', opacity: 0 },
  center: { y: '0%', opacity: 1, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 } },
  exit: { y: '-70%', opacity: 0, transition: { duration: 0.55, ease: 'easeIn' } },
};

/** The product on the stage: free-standing when it is a cut-out, a rounded print when it is a photo. */
const StagePicture: React.FC<{ image?: ProductImage; alt: string; reflect?: boolean; imgRef?: React.Ref<HTMLImageElement> }> = ({ image, alt, reflect = false, imgRef }) => {
  const src = imageUrl(image);
  const cutout = useCutout(src);
  if (!src) return null;
  return cutout
    ? <img ref={imgRef} src={src} alt={reflect ? '' : alt} draggable={false} onError={handleSquareImageError} className={`lt-stage-pic ${reflect ? 'lt-stage-reflect' : ''} object-contain`} data-cutout="true" />
    : <img ref={imgRef} src={src} alt={reflect ? '' : alt} draggable={false} onError={handleSquareImageError} className={`lt-stage-pic lt-stage-print ${reflect ? 'lt-stage-reflect' : ''} object-cover`} />;
};

/**
 * LT-605 'stage' (electric's own, from Erel's sneaker product hero; a paid
 * design, it floats by itself): the product floating mid-stage over its floor
 * shadow and a faint reflection, the words at one side and what to pick at the
 * other. A picked colour washes the stage in it and slides its name by, huge,
 * behind the product; another picture lifts the one on show up and away while
 * the new one rises in. Pointed at, the product leans towards the pointer;
 * held, a loupe shows it close; the pictures open in a viewer of their own.
 * The reference's stars, likes, stock counts and cart stay out: no fact here
 * is one the owner did not give, and the button is the site's own inquiry.
 */
const ProductStage: React.FC<ProductLookProps> = ({ product, currency, phone, cta, choice, onChoice, businessName, logo, share, copied, actionsRef }) => {
  const { t, language } = useLanguage();
  const { go } = useSiteNav();
  const { editing } = useEdit();
  const still = useStill() || editing;
  const rtl = language === 'he' || language === 'ar';
  const images = product.images;
  const [at, setAt] = useState(0);
  const [dir, setDir] = useState(1);
  const [viewer, setViewer] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);
  const [hintSeen, setHintSeen] = useState(false);
  const [stageWidth, setStageWidth] = useState(600);
  const [asleep, setAsleep] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const picRef = useRef<HTMLImageElement>(null);
  const loupeRef = useRef<HTMLSpanElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const holding = useRef(false);
  const lastPointer = useRef('mouse');

  const colors = product.colors ?? [];
  const sizes = product.sizes ?? [];
  const picked = colors.find((c) => c.name === choice.color);
  const word = picked?.name ?? product.category ?? product.name;
  const image = images[Math.min(at, Math.max(0, images.length - 1))];
  const more = Math.max(0, images.length - 3);

  // The stage's width sets the huge word's size; off-screen, the float sleeps.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    setStageWidth(stage.clientWidth || 600);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => setStageWidth(stage.clientWidth || 600));
    ro?.observe(stage);
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([e]) => setAsleep(!e.isIntersecting));
    io?.observe(stage);
    return () => { ro?.disconnect(); io?.disconnect(); };
  }, []);

  // A mouse or a pen: the product leans towards it.
  useEffect(() => {
    const root = rootRef.current;
    const tilt = tiltRef.current;
    if (!root || !tilt || still || typeof window.matchMedia !== 'function' || !window.matchMedia('(pointer: fine)').matches) return;
    let raf = 0;
    const lean = (x: number, y: number) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { tilt.style.transform = `perspective(1100px) rotateY(${x * 12}deg) rotateX(${-y * 7}deg)`; });
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const r = (stageRef.current ?? root).getBoundingClientRect();
      if (!r.width || !r.height) return;
      const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      lean(holding.current ? 0 : nx, holding.current ? 0 : ny);
    };
    const onLeave = () => lean(0, 0);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      tilt.style.transform = '';
    };
  }, [still]);

  const show = (i: number) => {
    if (!images.length) return;
    const next = ((i % images.length) + images.length) % images.length;
    if (next === at) return;
    setDir(next > at ? 1 : -1);
    setAt(next);
  };

  // The loupe: held on the product (a mouse or a pen), it shows it 2.2 times closer.
  const placeLoupe = (e: React.PointerEvent) => {
    const stage = stageRef.current;
    const img = picRef.current;
    const loupe = loupeRef.current;
    if (!stage || !img || !loupe) return;
    const st = stage.getBoundingClientRect();
    const box = img.getBoundingClientRect();
    const nw = img.naturalWidth || box.width;
    const nh = img.naturalHeight || box.height;
    // Where the picture is really drawn inside its box (contain: whole and bottom-set; cover: filled).
    const cover = img.classList.contains('object-cover');
    const scale = cover ? Math.max(box.width / nw, box.height / nh) : Math.min(box.width / nw, box.height / nh);
    const w = nw * scale;
    const h = nh * scale;
    const left = box.left + (box.width - w) / 2;
    const top = cover ? box.top + (box.height - h) / 2 : box.bottom - h;
    const size = loupe.offsetWidth;
    const zoomBy = 2.2;
    loupe.style.transform = `translate(${e.clientX - st.left - size / 2}px, ${e.clientY - st.top - size / 2}px)`;
    loupe.style.backgroundSize = `${w * zoomBy}px ${h * zoomBy}px`;
    loupe.style.backgroundPosition = `${-((e.clientX - left) * zoomBy - size / 2)}px ${-((e.clientY - top) * zoomBy - size / 2)}px`;
  };
  const onStageDown = (e: React.PointerEvent) => {
    lastPointer.current = e.pointerType;
    if (e.pointerType === 'touch' || e.button !== 0 || !image || !loupeRef.current) return;
    holding.current = true;
    setHintSeen(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    loupeRef.current.style.backgroundImage = `url("${imageUrl(image)}")`;
    if (tiltRef.current) tiltRef.current.style.transform = '';
    placeLoupe(e);
    loupeRef.current.dataset.on = 'true';
  };
  const onStageMove = (e: React.PointerEvent) => { if (holding.current) placeLoupe(e); };
  const onStageUp = () => {
    if (!holding.current) return;
    holding.current = false;
    if (loupeRef.current) delete loupeRef.current.dataset.on;
  };

  const close = useCallback(() => { setViewer(null); setZoom(false); }, []);
  useDialogFocus(viewer !== null, dialogRef as React.RefObject<HTMLElement>, close);
  const step = useCallback((by: number) => {
    setZoom(false);
    setViewer((v) => (v === null ? v : (v + by + images.length) % images.length));
  }, [images.length]);
  useEffect(() => {
    if (viewer === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(rtl ? -1 : 1);
      else if (e.key === 'ArrowLeft') step(rtl ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer, step, rtl]);

  const Prev = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;
  const label = 'text-sm font-medium text-light-text/65 dark:text-dark-text/65';
  const fontSize = wordSize(stageWidth, word);

  const stage = (
    <div
      ref={stageRef}
      className={`lt-stage relative min-h-[18rem] w-full select-none sm:min-h-[22rem] lg:min-h-[28rem] ${still ? '' : 'lt-stage-live'}`}
      data-asleep={asleep || undefined}
      onPointerDown={onStageDown}
      onPointerMove={onStageMove}
      onPointerUp={onStageUp}
      onPointerCancel={onStageUp}
      onClick={() => { if (lastPointer.current === 'touch' && images.length) setViewer(at); }}
      data-testid="stage"
    >
      {/* The picked colour's pool of light, here only: on a tall phone column a pool over the whole look would read as a stripe. */}
      <span className="lt-stage-wash" data-on={!picked || undefined} style={{ background: 'radial-gradient(50% 55% at 50% 45%, rgb(var(--color-primary) / 0.16), transparent 72%)' }} aria-hidden="true" />
      {colors.map((c) => (
        <span key={c.name} className="lt-stage-wash" data-on={picked?.name === c.name || undefined} style={{ background: poolOf(c.hex) }} aria-hidden="true" />
      ))}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex -translate-y-[12%] justify-center overflow-hidden" aria-hidden="true">
        {still ? (
          <span className="lt-stage-word" style={{ fontSize }}>{word}</span>
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span key={word} className="lt-stage-word" style={{ fontSize }} variants={slide} initial="enter" animate="center" exit="exit">{word}</motion.span>
          </AnimatePresence>
        )}
      </div>
      <span className="lt-stage-floor" aria-hidden="true" />
      <div className="lt-stage-mirror pointer-events-none absolute inset-0" aria-hidden="true">
        {image && <StagePicture key={image.url} image={image} alt="" reflect />}
      </div>
      <div className="lt-stage-float absolute inset-0">
        <div ref={tiltRef} className="lt-stage-tilt absolute inset-0">
          {still || !image ? (
            image ? <StagePicture image={image} alt={altOfImage(product, image)} imgRef={picRef} /> : null
          ) : (
            <AnimatePresence initial={false} custom={dir}>
              <motion.div key={image.url} className="absolute inset-0" custom={dir} variants={swap} initial="enter" animate="center" exit="exit">
                <StagePicture image={image} alt={altOfImage(product, image)} imgRef={picRef} />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
      {product.soldOut && <SoldOut className="absolute top-3 start-3 z-[3]" />}
      <span ref={loupeRef} className="lt-stage-loupe" aria-hidden="true" />
      {images.length > 0 && (
        <span className={`lt-stage-hint ${hintSeen ? 'opacity-0' : ''}`} aria-hidden="true">
          <span className="lt-stage-hint-fine">{t('products.holdToZoom')}</span>
          <span className="lt-stage-hint-touch">{t('products.tapToView')}</span>
        </span>
      )}
    </div>
  );

  return (
    <div ref={rootRef} className="relative isolate overflow-hidden rounded-design-card px-4 py-8 sm:px-8 md:py-12" data-testid="product-stage">
      {/* Each colour's wash, one over the other: the picked one fades in. */}
      <span className="absolute inset-0 -z-10 bg-light-surface/60 dark:bg-dark-surface/60" aria-hidden="true" />
      {colors.map((c) => (
        <span key={c.name} className="lt-stage-wash -z-10" data-on={picked?.name === c.name || undefined} style={{ background: washOf(c.hex) }} aria-hidden="true" />
      ))}

      <div className="grid grid-cols-1 gap-8 text-light-text dark:text-dark-text lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_minmax(0,15rem)] lg:items-start lg:gap-10">
        <div className="order-2 lg:order-1">
          {product.category && <p className="text-sm text-light-text/65 break-words dark:text-dark-text/65">{product.category}</p>}
          <h1 className="mt-2 font-semibold tracking-tight break-words" style={{ fontSize: 'clamp(1.7rem, 1.3rem + 1.4vw, 2.4rem)', lineHeight: 1.15 }}>{product.name}</h1>
          {(product.summary || product.description) && (
            <p className="mt-5 whitespace-pre-line text-[15px] italic leading-relaxed text-light-text/70 break-words dark:text-dark-text/70">{product.summary || product.description}</p>
          )}
          {images.length > 1 && (
            <div className="mt-8 flex flex-wrap items-center gap-3" role="group" aria-label={t('products.pictures')}>
              {images.slice(0, 3).map((img, i) => (
                <button key={img.url} type="button" onClick={() => { show(i); setViewer(i); }} aria-label={t('products.picture', { index: i + 1 })} className="h-12 w-16 overflow-hidden rounded-md bg-light-bg/70 transition-transform [@media(hover:hover)]:hover:-translate-y-0.5 dark:bg-dark-bg/70">
                  <img src={imageUrl(img)} alt="" loading="lazy" onError={handleSquareImageError} className="h-full w-full object-cover" />
                </button>
              ))}
              {more > 0 && (
                <button type="button" onClick={() => setViewer(3)} className="flex h-12 w-12 items-center justify-center bg-light-text text-sm font-semibold text-light-bg transition-transform [@media(hover:hover)]:hover:scale-105 dark:bg-dark-text dark:text-dark-bg" aria-label={t('products.pictures')}>
                  <span dir="ltr">+{more}</span>
                </button>
              )}
            </div>
          )}
          {product.description && product.summary && product.description !== product.summary && (
            <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-light-text/80 break-words dark:text-dark-text/80">{product.description}</p>
          )}
        </div>

        <div className="order-1 lg:order-2">{stage}</div>

        <div className="order-3">
          {sizes.length > 0 && (<>
            <p className={label}>{t('products.size')}</p>
            <div className="mt-2.5 flex flex-wrap gap-2.5" role="group" aria-label={t('products.size')}>
              {sizes.map((size) => {
                const on = choice.size === size;
                return (
                  <button key={size} type="button" aria-pressed={on} onClick={() => onChoice({ ...choice, size: on ? undefined : size })} className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border-[1.5px] border-light-text px-2 text-sm font-medium transition-colors break-words dark:border-dark-text ${on ? 'bg-light-text text-light-bg dark:bg-dark-text dark:text-dark-bg' : 'hover:bg-light-text/10 dark:hover:bg-dark-text/10'}`}>
                    {size}
                  </button>
                );
              })}
            </div>
          </>)}
          {typeof product.price === 'number' && (
            <div className={`flex items-center justify-between gap-3 ${sizes.length ? 'mt-7' : ''}`}>
              <span className={label}>{t('products.price')}</span>
              <Price product={product} currency={currency} className="text-xl font-semibold" />
            </div>
          )}
          {colors.length > 0 && (<>
            <p className={`${label} mt-7`}>
              {t('products.color')}{picked ? <span className="text-light-text dark:text-dark-text">: {picked.name}</span> : null}
            </p>
            <div className="mt-3 flex flex-wrap gap-3" role="group" aria-label={t('products.color')}>
              {colors.map((c) => {
                const on = picked?.name === c.name;
                return (
                  <button key={c.name} type="button" title={c.name} aria-label={c.name} aria-pressed={on} onClick={() => onChoice({ ...choice, color: on ? undefined : c.name })} className="lt-stage-swatch" data-on={on || undefined} style={{ '--sw': c.hex } as React.CSSProperties} />
                );
              })}
            </div>
          </>)}
          <div ref={actionsRef}>
            <ProductActions product={product} phone={phone} label={cta} choice={choice} className="mt-8 [&>a]:w-full [&>a]:flex-none" />
          </div>
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-light-text/15 pt-5 dark:border-dark-text/15">
            <a href="/" onClick={(e) => followLink(e, '/', go)} className="flex min-w-0 items-center gap-2.5">
              {logo && <img src={ImagesService.getInstance().getImage(logo)} alt="" onError={handleSquareImageError} className="h-9 w-9 shrink-0 rounded-full object-cover" />}
              <span className="min-w-0 text-sm font-semibold break-words">{businessName}</span>
            </a>
            <button type="button" onClick={share} aria-label={copied ? t('products.copied') : t('products.share')} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-light-text/10 dark:hover:bg-dark-text/10">
              {copied ? <Check className="h-5 w-5" aria-hidden="true" /> : <Share2 className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {viewer !== null && images[viewer] && (
        <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-[60] grid place-items-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={t('products.pictures')} data-testid="stage-viewer">
          <button type="button" tabIndex={-1} aria-label={t('products.close')} onClick={close} className="absolute inset-0 cursor-zoom-out bg-light-bg/90 dark:bg-dark-bg/90" />
          <div className="relative flex w-full max-w-[880px] flex-col gap-3.5 text-light-text dark:text-dark-text">
            <div className="flex items-center gap-3 text-sm">
              <strong className="font-semibold">{t('products.picture', { index: viewer + 1 })}</strong>
              <span dir="ltr" className="text-light-text/60 dark:text-dark-text/60" style={{ fontVariantNumeric: 'tabular-nums' }}>{viewer + 1} / {images.length}</span>
              <button type="button" onClick={close} aria-label={t('products.close')} className="ms-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-light-surface shadow-[0_0_0_1px_rgb(0_0_0/0.1)] dark:bg-dark-surface">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div
              className={`relative aspect-[16/10] max-h-[72vh] w-full overflow-hidden rounded-2xl bg-light-surface dark:bg-dark-surface ${zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
              style={picked ? { background: `${poolOf(picked.hex)}, ${washOf(picked.hex)}` } : undefined}
              onClick={(e) => { if (!(e.target as HTMLElement).closest('button')) setZoom((z) => !z); }}
              onPointerMove={(e) => {
                if (!zoom) return;
                const r = e.currentTarget.getBoundingClientRect();
                const pic = e.currentTarget.querySelector('img');
                if (pic) pic.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
              }}
            >
              <img src={imageUrl(images[viewer])} alt={altOfImage(product, images[viewer])} onError={handleSquareImageError} className="absolute inset-0 h-full w-full object-contain transition-transform duration-500" style={{ transform: `scale(${zoom ? 2.2 : 1})` }} />
              {images.length > 1 && (<>
                <button type="button" onClick={() => step(-1)} aria-label={t('products.previous')} className="absolute start-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-light-bg shadow-[0_0_0_1px_rgb(0_0_0/0.12)] dark:bg-dark-bg"><Prev className="h-5 w-5" aria-hidden="true" /></button>
                <button type="button" onClick={() => step(1)} aria-label={t('products.next')} className="absolute end-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-light-bg shadow-[0_0_0_1px_rgb(0_0_0/0.12)] dark:bg-dark-bg"><Next className="h-5 w-5" aria-hidden="true" /></button>
              </>)}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-0.5">
                {images.map((img, i) => (
                  <button key={img.url} type="button" onClick={() => { setZoom(false); setViewer(i); }} aria-label={t('products.picture', { index: i + 1 })} aria-current={i === viewer || undefined} className={`h-12 w-[4.5rem] shrink-0 overflow-hidden rounded-lg transition-opacity ${i === viewer ? 'opacity-100 shadow-[0_0_0_2px_currentColor]' : 'opacity-60 hover:opacity-90'}`}>
                    <img src={imageUrl(img)} alt="" loading="lazy" onError={handleSquareImageError} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductStage;

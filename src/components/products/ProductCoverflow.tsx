import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useEdit } from '../../services/editMode';
import { useStill } from '../../hooks/useA11yPrefs';
import type { ProductCard } from '../../models/Product';
import { handleWideImageError } from '../../utils/imageFallback';
import { CoverImage, Price, SoldOut, useProductLink } from './ProductParts';
import { ringOffset } from './motion';

const AUTOPLAY_MS = 4500;
const EASE = 'cubic-bezier(.22,.85,.3,1)';

/**
 * LT-540: 'coverflow' (underground's own, from a 21st.dev reference): one card
 * large with its words on the picture, its neighbours turned away behind it.
 * Transitions on transform and opacity, with no blur: nothing here stalls an old
 * phone. It turns by itself until a visitor touches it, and then never again.
 */
const ProductCoverflow: React.FC<{ items: ProductCard[]; pages: boolean; currency?: string }> = ({ items, pages, currency }) => {
  const { t, language } = useLanguage();
  const { editing } = useEdit();
  const still = useStill();
  const rtl = language === 'he' || language === 'ar';
  const dir = rtl ? -1 : 1;
  const linkOf = useProductLink(pages);
  const n = items.length;

  const rootRef = useRef<HTMLDivElement>(null);
  const touched = useRef(false);
  const swipe = useRef<null | { id: number; x: number; y: number }>(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (still || editing || !inView || touched.current) return;
    const id = window.setInterval(() => { if (!touched.current) setActive((a) => (a + 1) % n); }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [still, editing, inView, n]);

  const go = (by: number) => { touched.current = true; setActive((a) => (a + by + n) % n); };

  const onPointerDown = (e: React.PointerEvent) => {
    touched.current = true;
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) >= 40 && Math.abs(dx) >= Math.abs(e.clientY - s.y)) go((dx < 0) !== rtl ? 1 : -1);
  };

  const Prev = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;
  const arrow = 'absolute top-1/2 z-40 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors';

  return (
    <div
      ref={rootRef}
      data-testid="products-coverflow"
      className="relative mx-auto h-[30rem] w-full max-w-5xl touch-pan-y select-none md:h-[34rem]"
      style={{ perspective: 1300, overflowX: 'clip' }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {items.map((product, i) => {
        const offset = ringOffset(i, active, n);
        const far = Math.abs(offset);
        const centre = offset === 0;
        const link = linkOf(product);
        return (
          <a
            key={product.id}
            href={link.href}
            tabIndex={centre ? 0 : -1}
            aria-hidden={far > 1 || undefined}
            aria-label={product.name}
            draggable={false}
            onClick={(e) => {
              if (!centre) { e.preventDefault(); go(offset); return; }
              link.onClick(e);
            }}
            className="absolute left-1/2 top-1/2 block h-[26rem] w-[17rem] overflow-hidden rounded-design-card bg-black shadow-card md:h-[30rem] md:w-[20rem]"
            style={{
              zIndex: 20 - far,
              opacity: far > 2 ? 0 : 1,
              visibility: far > 2 ? 'hidden' : undefined,
              pointerEvents: far > 2 ? 'none' : undefined,
              transform: `translate(-50%,-50%) translate3d(${offset * dir * 58}%,0,${-far * 110}px) rotateY(${-offset * dir * 36}deg)`,
              transition: still ? 'none' : `transform 620ms ${EASE}, opacity 400ms ease`,
            }}
          >
            <CoverImage product={product} eager onError={handleWideImageError} className="pointer-events-none" />
            <span aria-hidden="true" className="absolute inset-0 bg-black transition-opacity duration-500" style={{ opacity: centre ? 0 : 0.55 }} />
            {product.soldOut && <SoldOut className="absolute top-3 start-3" />}
            <span className={`absolute inset-x-0 bottom-0 block bg-gradient-to-t from-black/85 via-black/60 to-transparent p-5 pt-16 text-center text-white transition-opacity duration-500 ${centre ? 'opacity-100' : 'opacity-0'}`}>
              <span className="block text-2xl font-bold leading-tight break-words" style={{ fontFamily: rtl ? 'var(--font-heading-rtl)' : 'var(--font-heading)' }}>{product.name}</span>
              {product.summary && <span className="mt-1 block text-sm opacity-90 break-words">{product.summary}</span>}
              <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-neutral-900">
                {product.price !== undefined ? <Price product={product} currency={currency} /> : t('products.more')}
              </span>
            </span>
          </a>
        );
      })}
      <button type="button" className={`${arrow} start-1 md:start-6`} aria-label={t('products.previous')} onClick={() => go(-1)}><Prev className="h-5 w-5" aria-hidden="true" /></button>
      <button type="button" className={`${arrow} end-1 md:end-6`} aria-label={t('products.next')} onClick={() => go(1)}><Next className="h-5 w-5" aria-hidden="true" /></button>
    </div>
  );
};

export default ProductCoverflow;

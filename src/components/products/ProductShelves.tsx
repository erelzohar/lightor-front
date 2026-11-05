import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStill } from '../../hooks/useA11yPrefs';
import type { ProductCard } from '../../models/Product';
import { handleWideImageError } from '../../utils/imageFallback';
import { CoverImage, Price, SoldOut, useProductLink } from './ProductParts';

/**
 * LT-588: products in a row that scrolls sideways, with arrows. The page's own
 * scroll and a finger's swipe stay the browser's; the arrows move the row by
 * a card, and grey out at its ends (on right-to-left pages too).
 */
const useRow = () => {
  const ref = useRef<HTMLDivElement>(null);
  const still = useStill();
  const [ends, setEnds] = useState({ start: true, end: true });
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Right to left the row scrolls to negative offsets: the distance is what counts.
    const at = Math.abs(el.scrollLeft);
    setEnds({ start: at <= 2, end: at + el.clientWidth >= el.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);
  /** One card on (1) or back (-1), towards the end of the reading. */
  const step = (by: 1 | -1) => {
    const el = ref.current;
    if (!el || typeof el.scrollBy !== 'function') return;
    const card = el.firstElementChild as HTMLElement | null;
    const width = card ? card.getBoundingClientRect().width + 16 : el.clientWidth * 0.8;
    const rtl = getComputedStyle(el).direction === 'rtl';
    el.scrollBy({ left: by * width * (rtl ? -1 : 1), behavior: still ? 'auto' : 'smooth' });
  };
  return { ref, ends, measure, step };
};

const Arrows: React.FC<{ ends: { start: boolean; end: boolean }; step: (by: 1 | -1) => void; small?: boolean }> = ({ ends, step, small = false }) => {
  const { t, language } = useLanguage();
  const rtl = language === 'he' || language === 'ar';
  const Prev = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;
  const button = `inline-flex ${small ? 'h-8 w-8' : 'h-10 w-10'} items-center justify-center rounded-full border border-light-text/20 text-light-text transition-colors hover:border-primary disabled:opacity-35 disabled:hover:border-light-text/20 dark:border-dark-text/20 dark:text-dark-text dark:hover:border-primary-dark`;
  if (ends.start && ends.end) return null;
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button type="button" className={button} onClick={() => step(-1)} disabled={ends.start} aria-label={t('products.previous')}><Prev className="h-4 w-4" aria-hidden="true" /></button>
      <button type="button" className={button} onClick={() => step(1)} disabled={ends.end} aria-label={t('products.next')}><Next className="h-4 w-4" aria-hidden="true" /></button>
    </div>
  );
};

const ROW = 'flex snap-x snap-mandatory gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/**
 * LT-588 'rows' (Erel's carousel cards): a category's products as a row of
 * cards, the picture on top with its badge, the name, a line and the price.
 */
export const ProductRow: React.FC<{ id?: string; title: string; items: ProductCard[]; pages: boolean; currency?: string }> = ({ id, title, items, pages, currency }) => {
  const linkOf = useProductLink(pages);
  const { ref, ends, measure, step } = useRow();
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-28" data-testid="products-row">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-xl font-semibold tracking-tight text-light-text break-words dark:text-dark-text md:text-2xl">{title}</h2>
        <Arrows ends={ends} step={step} small />
      </div>
      <div ref={ref} onScroll={measure} className={`${ROW} -mx-1 px-1 pb-2`}>
        {items.map((product) => (
          <a key={product.id} {...linkOf(product)} className="group block w-[240px] flex-none snap-start overflow-hidden rounded-xl bg-light-surface shadow-sm transition-shadow hover:shadow-md dark:bg-dark-surface md:w-[260px]">
            <div className="relative aspect-[4/3] overflow-hidden">
              <CoverImage product={product} onError={handleWideImageError} className="transition-transform duration-300 group-hover:scale-105" />
              {product.soldOut && <SoldOut className="absolute top-2 start-2" />}
            </div>
            <div className="space-y-0.5 p-3 text-light-text dark:text-dark-text">
              <h3 className="text-sm font-medium tracking-tight break-words">{product.name}</h3>
              {product.summary && <p className="text-xs text-light-text/65 dark:text-dark-text/65 break-words">{product.summary}</p>}
              <Price product={product} currency={currency} className="pt-1 text-sm font-semibold" />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

/**
 * LT-588 'drops' and 'shelves' (Erel's drop card): the products in a card of
 * their own, side by side (three on a computer, two on a tablet, one and a
 * bit on a phone), the arrows in the card's head beside its title. Each one a
 * small card: a line above (its category), the picture whole on a quiet
 * ground, the name and the price.
 */
export const ProductShelf: React.FC<{ id?: string; title?: string; subtitle?: string; items: ProductCard[]; pages: boolean; currency?: string; testId?: string }> = ({ id, title, subtitle, items, pages, currency, testId = 'products-shelf' }) => {
  const linkOf = useProductLink(pages);
  const { ref, ends, measure, step } = useRow();
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={title ? headingId : undefined} className="scroll-mt-28 overflow-hidden rounded-design-card border border-light-text/10 bg-light-surface shadow-sm dark:border-dark-text/10 dark:bg-dark-surface" data-testid={testId}>
      <div className="flex items-center justify-between gap-3 p-5 md:p-6">
        <div className="min-w-0">
          {title && <h2 id={headingId} className="text-xl font-semibold leading-tight tracking-tight text-light-text break-words dark:text-dark-text md:text-2xl">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm text-light-text/65 dark:text-dark-text/65 break-words">{subtitle}</p>}
        </div>
        <Arrows ends={ends} step={step} />
      </div>
      <div ref={ref} onScroll={measure} className={`${ROW} px-5 pb-6 md:px-6`}>
        {items.map((product) => (
          <a
            key={product.id}
            {...linkOf(product)}
            className="group flex flex-none basis-[80%] snap-start flex-col gap-3 rounded-design border border-light-text/10 bg-light-bg p-4 text-light-text transition-colors hover:border-primary/40 dark:border-dark-text/10 dark:bg-dark-bg dark:text-dark-text sm:basis-[calc(50%_-_0.5rem)] lg:basis-[calc(33.333%_-_0.6667rem)]"
          >
            <p className="text-sm text-light-text/60 dark:text-dark-text/60 break-words">{product.category || ' '}</p>
            <div className="relative aspect-video overflow-hidden rounded-design-sm bg-light-text/[0.05] dark:bg-dark-text/[0.07]">
              <CoverImage product={product} onError={handleWideImageError} className="!object-contain transition-transform duration-300 group-hover:scale-105" />
              {product.soldOut && <SoldOut className="absolute top-2 start-2" />}
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold leading-snug break-words">{product.name}</h3>
                {product.summary && <p className="mt-0.5 text-sm text-light-text/65 dark:text-dark-text/65 break-words">{product.summary}</p>}
              </div>
              <Price product={product} currency={currency} className="shrink-0 font-medium" />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

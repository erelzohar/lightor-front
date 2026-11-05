import React, { useId, useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { categoriesOf, productPrice, type ProductCard } from '../../models/Product';
import type { ProductCardStyle } from '../../models/DesignConfig';
import { ProductTile } from './ProductTiles';

type Sort = 'owner' | 'priceUp' | 'priceDown';

interface Filters {
  categories: string[];
  colors: string[];
  sizes: string[];
  inStock: boolean;
  /** Whole money, inclusive; null: no bound. */
  min: number | null;
  max: number | null;
}

const NONE: Filters = { categories: [], colors: [], sizes: [], inStock: false, min: null, max: null };

const toggle = (list: string[], value: string): string[] => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

/** Whole units of money, as the price range speaks (prices are minor units). */
const whole = (minor: number): number => Math.round(minor / 100);

export const matches = (p: ProductCard, f: Filters, ignoreCategory = false): boolean =>
  (ignoreCategory || !f.categories.length || (!!p.category && f.categories.includes(p.category)))
  && (!f.colors.length || (p.colors ?? []).some((c) => f.colors.includes(c.name)))
  && (!f.sizes.length || (p.sizes ?? []).some((s) => f.sizes.includes(s)))
  && (!f.inStock || !p.soldOut)
  && (f.min === null || (p.price !== undefined && whole(p.price) >= f.min))
  && (f.max === null || (p.price !== undefined && whole(p.price) <= f.max));

/** The owner's order, or by price either way; a product without a price last. */
export const sorted = (items: ProductCard[], sort: Sort): ProductCard[] => {
  if (sort === 'owner') return items;
  return [...items].sort((a, b) => {
    if (a.price === undefined) return b.price === undefined ? 0 : 1;
    if (b.price === undefined) return -1;
    return sort === 'priceUp' ? a.price - b.price : b.price - a.price;
  });
};

/**
 * LT-588 'shop' (Erel's shop page, Hirael's e-commerce 4): the products in a
 * grid beside their filters (by category with how many each holds, price,
 * colour, size, what is in stock), sorted as the visitor likes, what is chosen
 * shown as chips to take off. Only filters the products have facts for show:
 * no colour row for products without colours. A phone opens the filters above
 * the grid. The cards are the owner's.
 */
const ProductShop: React.FC<{ items: ProductCard[]; currency?: string; card?: ProductCardStyle; cta?: string; initialCategory?: string | null }> = ({ items, currency, card, cta, initialCategory }) => {
  const { t } = useLanguage();
  const id = useId();
  const [filters, setFilters] = useState<Filters>(() => (initialCategory && items.some((p) => p.category === initialCategory) ? { ...NONE, categories: [initialCategory] } : NONE));
  const [sort, setSort] = useState<Sort>('owner');
  const [open, setOpen] = useState(false);
  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  const facts = useMemo(() => {
    const prices = items.flatMap((p) => (p.price === undefined ? [] : [whole(p.price)]));
    const colors = new Map<string, string>();
    for (const p of items) for (const c of p.colors ?? []) if (!colors.has(c.name)) colors.set(c.name, c.hex);
    return {
      categories: categoriesOf(items),
      colors: [...colors.entries()].map(([name, hex]) => ({ name, hex })),
      sizes: [...new Set(items.flatMap((p) => p.sizes ?? []))],
      soldOut: items.some((p) => p.soldOut),
      low: prices.length ? Math.min(...prices) : 0,
      high: prices.length ? Math.max(...prices) : 0,
    };
  }, [items]);

  const results = sorted(items.filter((p) => matches(p, filters)), sort);
  const money = (n: number) => productPrice(n * 100, currency);
  const chips = [
    ...filters.categories.map((c) => ({ key: `c-${c}`, label: c, off: () => update({ categories: filters.categories.filter((x) => x !== c) }) })),
    ...filters.colors.map((c) => ({ key: `k-${c}`, label: c, off: () => update({ colors: filters.colors.filter((x) => x !== c) }) })),
    ...filters.sizes.map((s) => ({ key: `s-${s}`, label: s, off: () => update({ sizes: filters.sizes.filter((x) => x !== s) }) })),
    ...(filters.inStock ? [{ key: 'stock', label: t('products.inStockOnly'), off: () => update({ inStock: false }) }] : []),
    ...(filters.min !== null || filters.max !== null ? [{ key: 'price', label: `${money(filters.min ?? facts.low)} - ${money(filters.max ?? facts.high)}`, off: () => update({ min: null, max: null }) }] : []),
  ];
  const clear = () => setFilters(NONE);
  const legend = 'mb-3 text-xs font-medium uppercase tracking-wide text-light-text/60 dark:text-dark-text/60';
  const row = 'flex items-center gap-3 py-1 text-sm text-light-text dark:text-dark-text';

  const panel = (
    <div className="divide-y divide-light-text/10 dark:divide-dark-text/10">
      {facts.categories.length > 0 && (
        <fieldset className="pb-6">
          <legend className={legend}>{t('products.categories')}</legend>
          {facts.categories.map((c) => {
            const count = items.filter((p) => p.category === c && matches(p, filters, true)).length;
            const checked = filters.categories.includes(c);
            return (
              <label key={c} className={`${row} ${count === 0 && !checked ? 'opacity-50' : ''}`}>
                <input type="checkbox" checked={checked} disabled={count === 0 && !checked} onChange={() => update({ categories: toggle(filters.categories, c) })} className="h-4 w-4 shrink-0 accent-[rgb(var(--color-primary))]" />
                <span className="min-w-0 flex-1 break-words">{c}</span>
                <span className="text-xs tabular-nums text-light-text/60 dark:text-dark-text/60">{count}</span>
              </label>
            );
          })}
        </fieldset>
      )}
      {facts.high > facts.low && (
        <fieldset className="py-6">
          <legend className={legend}>{t('products.priceRange')}</legend>
          <label className="block text-sm text-light-text dark:text-dark-text" htmlFor={`${id}-min`}>{t('products.priceFrom')}: <span dir="ltr" className="tabular-nums">{money(filters.min ?? facts.low)}</span></label>
          <input id={`${id}-min`} type="range" min={facts.low} max={facts.high} step={1} value={filters.min ?? facts.low} onChange={(e) => { const v = Number(e.target.value); update({ min: v <= facts.low ? null : Math.min(v, filters.max ?? facts.high) }); }} className="mt-1 w-full accent-[rgb(var(--color-primary))]" />
          <label className="mt-3 block text-sm text-light-text dark:text-dark-text" htmlFor={`${id}-max`}>{t('products.priceTo')}: <span dir="ltr" className="tabular-nums">{money(filters.max ?? facts.high)}</span></label>
          <input id={`${id}-max`} type="range" min={facts.low} max={facts.high} step={1} value={filters.max ?? facts.high} onChange={(e) => { const v = Number(e.target.value); update({ max: v >= facts.high ? null : Math.max(v, filters.min ?? facts.low) }); }} className="mt-1 w-full accent-[rgb(var(--color-primary))]" />
        </fieldset>
      )}
      {facts.colors.length > 0 && (
        <fieldset className="py-6">
          <legend className={legend}>{t('products.color')}</legend>
          <div className="flex flex-wrap gap-2">
            {facts.colors.map((c) => {
              const on = filters.colors.includes(c.name);
              return (
                <button key={c.name} type="button" title={c.name} aria-label={c.name} aria-pressed={on} onClick={() => update({ colors: toggle(filters.colors, c.name) })}
                  className={`h-7 w-7 rounded-full border border-black/15 dark:border-white/20 ${on ? 'ring-2 ring-light-text ring-offset-2 ring-offset-light-bg dark:ring-dark-text dark:ring-offset-dark-bg' : 'hover:opacity-90'}`}
                  style={{ backgroundColor: c.hex }} />
              );
            })}
          </div>
        </fieldset>
      )}
      {facts.sizes.length > 0 && (
        <fieldset className="py-6">
          <legend className={legend}>{t('products.size')}</legend>
          <div className="flex flex-wrap gap-2">
            {facts.sizes.map((s) => {
              const on = filters.sizes.includes(s);
              return (
                <button key={s} type="button" aria-pressed={on} onClick={() => update({ sizes: toggle(filters.sizes, s) })}
                  className={`min-h-9 min-w-[2.5rem] rounded-design-sm px-2 text-sm font-medium transition-colors ${on ? 'bg-primary text-on-primary dark:bg-primary-dark dark:text-on-primary-dark' : 'bg-light-text/[0.07] text-light-text hover:bg-light-text/15 dark:bg-dark-text/10 dark:text-dark-text'}`}>
                  {s}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      {facts.soldOut && (
        <div className="pt-6">
          <label className={row}>
            <input type="checkbox" checked={filters.inStock} onChange={(e) => update({ inStock: e.target.checked })} className="h-4 w-4 shrink-0 accent-[rgb(var(--color-primary))]" />
            <span>{t('products.inStockOnly')}</span>
          </label>
        </div>
      )}
    </div>
  );

  const hasFilters = facts.categories.length > 0 || facts.high > facts.low || facts.colors.length > 0 || facts.sizes.length > 0 || facts.soldOut;
  return (
    <div className={`grid gap-10 ${hasFilters ? 'lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14' : ''}`} data-testid="products-shop">
      {hasFilters && (
        <aside aria-label={t('products.filters')} className="hidden lg:sticky lg:top-[calc(var(--nav-offset,0px)_+_1.5rem)] lg:block lg:self-start">
          <div className="flex items-center justify-between border-b border-light-text/10 pb-3 dark:border-dark-text/10">
            <span className="text-sm font-medium text-light-text dark:text-dark-text">{t('products.filters')}</span>
            <button type="button" onClick={clear} disabled={!chips.length} className="text-sm text-light-text/60 hover:text-light-text disabled:opacity-40 dark:text-dark-text/60 dark:hover:text-dark-text">{t('products.clearAll')}</button>
          </div>
          <div className="pt-6">{panel}</div>
        </aside>
      )}
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-4 border-b border-light-text/10 pb-4 dark:border-dark-text/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {hasFilters && (
                <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-2 rounded-design border border-light-text/20 px-3 py-1.5 text-sm font-medium text-light-text dark:border-dark-text/20 dark:text-dark-text lg:hidden">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  {t('products.filters')}{chips.length ? <span className="tabular-nums">({chips.length})</span> : null}
                </button>
              )}
              <p aria-live="polite" className="text-sm tabular-nums text-light-text/70 dark:text-dark-text/70">{t('products.results', { count: results.length })}</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-light-text dark:text-dark-text">
              <span>{t('products.sort')}</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-design border border-light-text/20 bg-light-bg px-3 py-1.5 text-sm dark:border-dark-text/20 dark:bg-dark-bg">
                <option value="owner">{t('products.sortOwner')}</option>
                <option value="priceUp">{t('products.sortPriceUp')}</option>
                <option value="priceDown">{t('products.sortPriceDown')}</option>
              </select>
            </label>
          </div>
          {open && hasFilters && <div className="rounded-design-card border border-light-text/10 p-4 dark:border-dark-text/10 lg:hidden">{panel}</div>}
          {chips.length > 0 && (
            <ul className="m-0 flex list-none flex-wrap items-center gap-2 p-0" aria-label={t('products.activeFilters')}>
              {chips.map((chip) => (
                <li key={chip.key}>
                  <span className="inline-flex items-center gap-1 rounded-full border border-light-text/20 py-1 pe-1 ps-3 text-sm text-light-text dark:border-dark-text/20 dark:text-dark-text">
                    <span className="break-words">{chip.label}</span>
                    <button type="button" onClick={chip.off} aria-label={t('products.removeFilter', { name: chip.label })} className="grid h-6 w-6 place-items-center rounded-full hover:bg-light-text/10 dark:hover:bg-dark-text/10">
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                </li>
              ))}
              <li><button type="button" onClick={clear} className="text-sm text-light-text/60 underline-offset-4 hover:underline dark:text-dark-text/60">{t('products.clearAll')}</button></li>
            </ul>
          )}
        </div>
        {results.length ? (
          <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-8 p-0 sm:grid-cols-3 sm:gap-x-6">
            {results.map((product) => (
              <li key={product.id} className="lt-rise">
                <ProductTile product={product} pages currency={currency} card={card} cta={cta} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-design-card border border-dashed border-light-text/25 px-6 py-16 text-center dark:border-dark-text/25">
            <p className="text-lg font-medium text-light-text dark:text-dark-text">{t('products.noMatch')}</p>
            <button type="button" onClick={clear} className="mt-4 rounded-design border border-light-text/20 px-4 py-2 text-sm font-medium text-light-text dark:border-dark-text/20 dark:text-dark-text">{t('products.clearAll')}</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductShop;

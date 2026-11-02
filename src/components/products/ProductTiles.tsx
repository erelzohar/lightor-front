import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { categoriesOf, type ProductCard } from '../../models/Product';
import type { SectionTone } from '../SectionDivider';
import { handleSquareImageError, handleWideImageError } from '../../utils/imageFallback';
import { CoverImage, Price, SoldOut, imageUrl, useProductLink } from './ProductParts';

interface TilesProps {
  items: ProductCard[];
  pages: boolean;
  currency?: string;
  tone?: SectionTone;
}

/**
 * 'well' (the quiet one, from a 21st.dev reference): the picture in a tinted
 * well, name and price on one line under it, always readable: a phone has no
 * hover to reveal them with.
 */
export const WellTiles: React.FC<TilesProps> = ({ items, pages, currency, tone = 'bg' }) => {
  const linkOf = useProductLink(pages);
  const well = tone === 'surface' ? 'bg-light-bg dark:bg-dark-bg' : 'bg-light-surface dark:bg-dark-surface';
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-3 xl:grid-cols-4" data-testid="products-well">
      {items.map((product) => (
        <li key={product.id}>
          <a {...linkOf(product)} className="group block">
            <div className={`relative aspect-square overflow-hidden rounded-design-card ${well}`}>
              <CoverImage product={product} className="transition-transform duration-500 group-hover:scale-105" />
              {product.soldOut && <SoldOut className="absolute top-3 start-3" />}
            </div>
            <div className="mt-3 flex items-start justify-between gap-3 text-light-text dark:text-dark-text">
              <div className="min-w-0">
                <h3 className="font-medium leading-snug break-words">{product.name}</h3>
                {(product.summary || product.category) && (
                  <p className="mt-0.5 text-sm text-light-text/70 dark:text-dark-text/70 break-words">{product.summary || product.category}</p>
                )}
              </div>
              <Price product={product} currency={currency} className="shrink-0 font-medium" />
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
};

/**
 * 'swap' (Erel's product card): hovering the card brings its second picture up,
 * and the dots switch between them on any device. His colour swatches are these
 * dots: pictures are what every product has.
 */
const SwapTile: React.FC<{ product: ProductCard; pages: boolean; currency?: string }> = ({ product, pages, currency }) => {
  const { t } = useLanguage();
  const linkOf = useProductLink(pages);
  const [shown, setShown] = useState(0);
  const images = product.images;
  return (
    <article className="group text-center">
      <div className="relative">
        <a {...linkOf(product)} tabIndex={-1} aria-hidden="true" className="block">
          <div className="relative aspect-[4/5] overflow-hidden rounded-design-card bg-light-surface dark:bg-dark-surface">
            {!images.length && <CoverImage product={product} />}
            {images.map((image, i) => (
              <img
                key={image.url}
                src={imageUrl(image)}
                alt=""
                loading="lazy"
                onError={handleWideImageError}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${i === shown ? 'opacity-100' : 'opacity-0'} ${shown === 0 && i === 1 ? '[@media(hover:hover)]:group-hover:opacity-100' : ''}`}
              />
            ))}
            {product.soldOut && <SoldOut className="absolute top-3 start-3" />}
          </div>
        </a>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-1 flex justify-center gap-0.5" role="group" aria-label={t('products.pictures')}>
            {images.map((image, i) => (
              <button
                key={image.url}
                type="button"
                onClick={() => setShown(i)}
                aria-label={t('products.picture', { index: i + 1 })}
                aria-current={i === shown || undefined}
                className="flex h-6 w-6 items-center justify-center"
              >
                <span className={`block h-2 w-2 rounded-full shadow ${i === shown ? 'bg-white' : 'bg-white/50'}`} />
              </button>
            ))}
          </div>
        )}
      </div>
      <a {...linkOf(product)} className="block">
        <h3 className="mt-3 px-1 font-medium text-light-text dark:text-dark-text break-words">{product.name}</h3>
        <Price product={product} currency={currency} className="mt-0.5 text-light-text/75 dark:text-dark-text/75" />
      </a>
    </article>
  );
};

export const SwapTiles: React.FC<TilesProps> = ({ items, pages, currency }) => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-4" data-testid="products-swap">
    {items.map((product) => <SwapTile key={product.id} product={product} pages={pages} currency={currency} />)}
  </div>
);

/** 'bento': mixed sizes with the words on the picture, the first product the largest. */
export const BentoTiles: React.FC<TilesProps> = ({ items, pages, currency }) => {
  const linkOf = useProductLink(pages);
  const span = (i: number): string => (i === 0 ? 'col-span-2 row-span-2' : i % 5 === 3 ? 'col-span-2' : '');
  return (
    <ul className="grid auto-rows-[10.5rem] grid-cols-2 gap-3 md:auto-rows-[13rem] md:grid-cols-4 md:gap-4" data-testid="products-bento">
      {items.map((product, i) => (
        <li key={product.id} className={span(i)}>
          <a {...linkOf(product)} className="group relative block h-full overflow-hidden rounded-design-card bg-light-surface dark:bg-dark-surface">
            <CoverImage product={product} onError={handleWideImageError} className="transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-10 text-white md:p-4 md:pt-12">
              <h3 className={`font-semibold leading-snug break-words ${i === 0 ? 'text-xl md:text-2xl' : 'text-sm md:text-base'}`}>{product.name}</h3>
              <Price product={product} currency={currency} className="text-sm opacity-90" />
            </div>
            {product.soldOut && <SoldOut className="absolute top-3 start-3" />}
          </a>
        </li>
      ))}
    </ul>
  );
};

/**
 * 'list': names with their prices beside them, by category. For a menu, or
 * for anyone whose pictures are not what sells.
 */
export const ListTiles: React.FC<TilesProps> = ({ items, pages, currency }) => {
  const linkOf = useProductLink(pages);
  const categories = categoriesOf(items);
  const groups = categories.length > 1
    ? [...categories.map((name) => ({ name, rows: items.filter((p) => p.category === name) })), { name: '', rows: items.filter((p) => !p.category) }]
    : [{ name: '', rows: items }];
  return (
    <div className="mx-auto max-w-3xl space-y-10" data-testid="products-list">
      {groups.filter((g) => g.rows.length).map((group) => (
        <div key={group.name}>
          {group.name && <h3 className="mb-3 text-lg font-bold text-primary dark:text-primary-dark break-words">{group.name}</h3>}
          <ul className="divide-y divide-light-text/15 dark:divide-dark-text/15">
            {group.rows.map((product) => (
              <li key={product.id}>
                <a {...linkOf(product)} className="group flex items-center gap-4 py-3 text-light-text dark:text-dark-text">
                  {product.images[0] && (
                    <img src={imageUrl(product.images[0])} alt="" loading="lazy" onError={handleSquareImageError} className="h-14 w-14 shrink-0 rounded-design-sm object-cover" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium break-words group-hover:text-primary dark:group-hover:text-primary-dark transition-colors">{product.name}</span>
                    {product.summary && <span className="block text-sm text-light-text/70 dark:text-dark-text/70 break-words">{product.summary}</span>}
                  </span>
                  {product.soldOut ? <SoldOut className="shrink-0" /> : <Price product={product} currency={currency} className="shrink-0 font-semibold" />}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

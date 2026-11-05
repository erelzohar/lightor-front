import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { categoriesOf, type ProductCard } from '../../models/Product';
import type { ProductCardStyle } from '../../models/DesignConfig';
import type { SectionTone } from '../SectionDivider';
import { handleSquareImageError, handleWideImageError } from '../../utils/imageFallback';
import { CoverImage, Price, ProductOptions, SoldOut, imageUrl, useProductLink } from './ProductParts';
import { rememberChoice, type ProductChoice } from '../../services/productAction';

interface TilesProps {
  items: ProductCard[];
  pages: boolean;
  currency?: string;
  tone?: SectionTone;
  /** LT-545: the card the owner chose; the tiles that are pictures only (bento, list) have none. */
  card?: ProductCardStyle;
  /** The words on a card's own button: the owner's, else the site's. */
  cta?: string;
}

const CARDS: ProductCardStyle[] = ['plain', 'framed', 'overlay', 'button', 'reveal', 'options'];
/** An unknown card is the plain one, as on a site that never chose. */
export const cardOf = (card: string | undefined): ProductCardStyle =>
  CARDS.includes(card as ProductCardStyle) ? (card as ProductCardStyle) : 'plain';

/**
 * LT-545 (Erel: three tiles left a column empty): fewer tiles than a row holds
 * stand in its middle, at the size they have in a full row.
 */
const FEW = 4;
const FEW_ROW = 'flex flex-wrap justify-center gap-x-4 gap-y-8 md:gap-x-6';
const FEW_ITEM = 'shrink-0 basis-[calc(50%_-_0.5rem)] md:basis-[calc(50%_-_0.75rem)] lg:basis-[calc(33.333%_-_1rem)] xl:basis-[calc(25%_-_1.125rem)]';
/** The swap tiles' full row holds four from `lg` up. */
const FEW_SWAP_ITEM = 'shrink-0 basis-[calc(50%_-_0.5rem)] md:basis-[calc(50%_-_0.75rem)] lg:basis-[calc(25%_-_1.125rem)]';

/**
 * A card's own button: the product's page at its form, or here, the form with
 * it chosen. LT-588: with the colour and size picked on the card.
 */
const CardButton: React.FC<{ product: ProductCard; pages: boolean; cta?: string; choice?: ProductChoice }> = ({ product, pages, cta, choice }) => {
  const { t } = useLanguage();
  const inquireOf = useProductLink(pages, true, choice);
  const link = inquireOf(product);
  return (
    <a
      href={link.href}
      onClick={(e) => { rememberChoice(product.id, choice); link.onClick(e); }}
      className="inline-flex w-full items-center justify-center gap-2 rounded-design bg-primary dark:bg-primary-dark px-4 py-2.5 text-sm font-bold text-on-primary dark:text-on-primary-dark hover:opacity-90 transition-opacity"
    >
      <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="break-words">{cta?.trim() || t('products.cta')}</span>
    </a>
  );
};

/** The name and the price under a picture, as every still card has them. */
const NameAndPrice: React.FC<{ product: ProductCard; currency?: string; className?: string }> = ({ product, currency, className = '' }) => (
  <div className={`flex items-start justify-between gap-3 text-light-text dark:text-dark-text ${className}`}>
    <div className="min-w-0">
      <h3 className="font-medium leading-snug break-words">{product.name}</h3>
      {(product.summary || product.category) && (
        <p className="mt-0.5 text-sm text-light-text/70 dark:text-dark-text/70 break-words">{product.summary || product.category}</p>
      )}
    </div>
    <Price product={product} currency={currency} className="shrink-0 font-medium" />
  </div>
);

/**
 * LT-588 'reveal' (Erel's reveal card): the picture, the name and the price; on
 * a pointer (or the keyboard's focus) the details and the buttons slide up over
 * it. A phone has no hover: a tap opens the product, as on every card. Solid
 * behind the words, no blur: nothing here stalls an old phone.
 */
const RevealCard: React.FC<{ product: ProductCard; pages: boolean; currency?: string; well: string; cta?: string }> = ({ product, pages, currency, well, cta }) => {
  const { t } = useLanguage();
  const linkOf = useProductLink(pages);
  const link = linkOf(product);
  const shown = '[@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100';
  return (
    <article className="group relative h-full overflow-hidden rounded-design-card card-design" data-card-look="reveal">
      <a {...link} className="flex h-full flex-col">
        <div className={`relative aspect-[4/3] overflow-hidden ${well}`}>
          <CoverImage product={product} className="transition-transform duration-500 [@media(hover:hover)]:group-hover:scale-110" />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          {product.soldOut && <SoldOut className="absolute top-3 start-3" />}
        </div>
        <div className="flex-1 space-y-1 p-4 text-light-text dark:text-dark-text md:p-5">
          {product.category && <p className="text-sm text-light-text/60 dark:text-dark-text/60 break-words">{product.category}</p>}
          <h3 className="text-lg font-bold leading-tight tracking-tight break-words">{product.name}</h3>
          <Price product={product} currency={currency} className="text-xl font-bold text-primary-readable dark:text-primary-dark-readable" />
        </div>
      </a>
      <div className={`pointer-events-none absolute inset-0 flex translate-y-full flex-col justify-end overflow-y-auto bg-light-surface/[0.97] p-4 opacity-0 transition-[transform,opacity] duration-300 ease-out dark:bg-dark-surface/[0.97] md:p-5 ${shown}`}>
        <div className="space-y-3 text-light-text dark:text-dark-text">
          <h4 className="font-semibold break-words">{product.name}</h4>
          {product.summary && <p className="text-sm leading-relaxed text-light-text/75 dark:text-dark-text/75 break-words">{product.summary}</p>}
          <CardButton product={product} pages={pages} cta={cta} />
          <a {...link} className="inline-flex w-full items-center justify-center rounded-design border-2 border-light-text/20 px-4 py-2 text-sm font-semibold hover:border-primary dark:border-dark-text/20 dark:hover:border-primary-dark transition-colors">
            {t('products.more')}
          </a>
        </div>
      </div>
    </article>
  );
};

/**
 * LT-588 'options' (Erel's card with colours and sizes): the pictures with
 * arrows and dots, the name and price, the colours and sizes to pick, and the
 * main button, which takes the pick to the inquiry.
 */
const OptionsCard: React.FC<{ product: ProductCard; pages: boolean; currency?: string; well: string; cta?: string }> = ({ product, pages, currency, well, cta }) => {
  const { t, language } = useLanguage();
  const linkOf = useProductLink(pages);
  const [shown, setShown] = useState(0);
  const [choice, setChoice] = useState<ProductChoice>({});
  const images = product.images;
  const rtl = language === 'he' || language === 'ar';
  const Prev = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;
  const step = (by: number) => setShown((i) => (i + by + images.length) % images.length);
  const round = 'inline-flex h-8 w-8 items-center justify-center rounded-full bg-light-bg/90 text-light-text shadow-sm transition-opacity dark:bg-dark-bg/90 dark:text-dark-text [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100';
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-design-card card-design" data-card-look="options">
      <div className={`relative aspect-[3/4] overflow-hidden ${well}`}>
        <a {...linkOf(product)} tabIndex={-1} aria-hidden="true" className="absolute inset-0 block">
          {!images.length && <CoverImage product={product} />}
          {images.map((image, i) => (
            <img key={image.url} src={imageUrl(image)} alt="" loading="lazy" onError={handleWideImageError} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${i === shown ? 'opacity-100' : 'opacity-0'}`} />
          ))}
        </a>
        {images.length > 1 && (<>
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between p-2">
            <button type="button" className={`${round} pointer-events-auto`} aria-label={t('products.previous')} onClick={() => step(-1)}><Prev className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" className={`${round} pointer-events-auto`} aria-label={t('products.next')} onClick={() => step(1)}><Next className="h-4 w-4" aria-hidden="true" /></button>
          </div>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1" role="group" aria-label={t('products.pictures')}>
            {images.map((image, i) => (
              <button key={image.url} type="button" onClick={() => setShown(i)} aria-label={t('products.picture', { index: i + 1 })} aria-current={i === shown || undefined} className="flex h-6 items-center justify-center px-0.5">
                <span className={`block h-1.5 rounded-full shadow transition-[width] ${i === shown ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`} />
              </button>
            ))}
          </div>
        </>)}
        {product.soldOut && <SoldOut className="absolute top-3 start-3" />}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 text-light-text dark:text-dark-text">
        <a {...linkOf(product)} className="block">
          <h3 className="font-medium leading-snug break-words">{product.name}</h3>
          <Price product={product} currency={currency} className="mt-1 text-lg font-semibold" />
        </a>
        <ProductOptions product={product} choice={choice} onChange={setChoice} compact />
        <div className="mt-auto pt-1"><CardButton product={product} pages={pages} cta={cta} choice={choice} /></div>
      </div>
    </article>
  );
};

/** One 'well' tile in the owner's card. */
const WellCard: React.FC<{ product: ProductCard; pages: boolean; currency?: string; well: string; card: ProductCardStyle; cta?: string }> = ({ product, pages, currency, well, card, cta }) => {
  const linkOf = useProductLink(pages);
  const zoom = 'transition-transform duration-500 group-hover:scale-105';
  if (card === 'reveal') return <RevealCard product={product} pages={pages} currency={currency} well={well} cta={cta} />;
  if (card === 'options') return <OptionsCard product={product} pages={pages} currency={currency} well={well} cta={cta} />;
  if (card === 'framed') {
    return (
      <a {...linkOf(product)} className="group card-design flex h-full flex-col overflow-hidden">
        <div className={`relative aspect-square overflow-hidden ${well}`}>
          <CoverImage product={product} className={zoom} />
          {product.soldOut && <SoldOut className="absolute top-3 start-3" />}
        </div>
        <NameAndPrice product={product} currency={currency} className="flex-1 p-3 md:p-4" />
      </a>
    );
  }
  if (card === 'overlay') {
    // The words and the picture share one cell: a long name makes the card taller, never cut.
    return (
      <a {...linkOf(product)} className={`group grid h-full overflow-hidden rounded-design-card ${well}`}>
        <div className="relative aspect-[4/5] self-stretch overflow-hidden [grid-area:1/1]">
          <CoverImage product={product} onError={handleWideImageError} className={zoom} />
        </div>
        {/* Positioned like the picture box, so they paint above it. */}
        <div className="relative self-end bg-gradient-to-t from-black/80 via-black/45 to-transparent p-3 pt-14 text-white [grid-area:1/1] md:p-4 md:pt-16">
          <h3 className="font-semibold leading-snug break-words">{product.name}</h3>
          <Price product={product} currency={currency} className="text-sm opacity-90" />
        </div>
        {product.soldOut && <SoldOut className="relative m-3 self-start justify-self-start [grid-area:1/1]" />}
      </a>
    );
  }
  const plain = (
    <a {...linkOf(product)} className="group block">
      <div className={`relative aspect-square overflow-hidden rounded-design-card ${well}`}>
        <CoverImage product={product} className={zoom} />
        {product.soldOut && <SoldOut className="absolute top-3 start-3" />}
      </div>
      <NameAndPrice product={product} currency={currency} className="mt-3" />
    </a>
  );
  if (card !== 'button') return plain;
  return (
    <div className="flex h-full flex-col">
      {plain}
      <div className="mt-auto pt-3"><CardButton product={product} pages={pages} cta={cta} /></div>
    </div>
  );
};

/** LT-588: one product in the owner's card, for the grids that lay their own rows (the shop). */
export const ProductTile: React.FC<{ product: ProductCard; pages: boolean; currency?: string; tone?: SectionTone; card?: ProductCardStyle; cta?: string }> = ({ product, pages, currency, tone = 'bg', card, cta }) => (
  <WellCard product={product} pages={pages} currency={currency} well={tone === 'surface' ? 'bg-light-bg dark:bg-dark-bg' : 'bg-light-surface dark:bg-dark-surface'} card={cardOf(card)} cta={cta} />
);

/**
 * 'well' (the quiet one, from a 21st.dev reference): the picture in a tinted
 * well, name and price on one line under it, always readable: a phone has no
 * hover to reveal them with.
 */
export const WellTiles: React.FC<TilesProps> = ({ items, pages, currency, tone = 'bg', card, cta }) => {
  const well = tone === 'surface' ? 'bg-light-bg dark:bg-dark-bg' : 'bg-light-surface dark:bg-dark-surface';
  const few = items.length < FEW;
  const style = cardOf(card);
  return (
    <ul className={few ? FEW_ROW : 'grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-3 xl:grid-cols-4'} data-testid="products-well" data-card={style}>
      {items.map((product) => (
        <li key={product.id} className={few ? FEW_ITEM : undefined}>
          <WellCard product={product} pages={pages} currency={currency} well={well} card={style} cta={cta} />
        </li>
      ))}
    </ul>
  );
};

/**
 * 'swap' (Erel's product card): hovering the card brings its second picture up,
 * and the dots switch between them on any device. His colour swatches are these
 * dots: pictures are what every product has. LT-545: in the owner's card; with
 * the words on the picture the dots move to its top.
 */
const SwapTile: React.FC<{ product: ProductCard; pages: boolean; currency?: string; card: ProductCardStyle; cta?: string }> = ({ product, pages, currency, card, cta }) => {
  const { t } = useLanguage();
  const linkOf = useProductLink(pages);
  const [shown, setShown] = useState(0);
  const images = product.images;
  const framed = card === 'framed';
  const overlay = card === 'overlay';
  const pictures = (
    <>
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
    </>
  );
  const dots = images.length > 1 && (
    <div className={`absolute inset-x-0 ${overlay ? 'top-1' : 'bottom-1'} flex justify-center gap-0.5`} role="group" aria-label={t('products.pictures')}>
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
  );
  if (overlay) {
    // The words and the pictures share one cell: a long name makes the card taller, never cut.
    return (
      <article className="group relative h-full">
        <a {...linkOf(product)} className="grid h-full overflow-hidden rounded-design-card bg-light-surface dark:bg-dark-surface">
          <div className="relative aspect-[4/5] self-stretch overflow-hidden [grid-area:1/1]">{pictures}</div>
          <div className="relative self-end bg-gradient-to-t from-black/80 via-black/45 to-transparent p-3 pt-14 text-center text-white [grid-area:1/1] md:p-4 md:pt-16">
            <h3 className="font-semibold leading-snug break-words">{product.name}</h3>
            <Price product={product} currency={currency} className="text-sm opacity-90" />
          </div>
          {product.soldOut && <SoldOut className="relative m-3 mt-9 self-start justify-self-start [grid-area:1/1]" />}
        </a>
        {dots}
      </article>
    );
  }
  return (
    <article className={`group flex h-full flex-col text-center ${framed ? 'card-design overflow-hidden' : ''}`}>
      <div className="relative">
        <a {...linkOf(product)} tabIndex={-1} aria-hidden="true" className="block">
          <div className={`relative aspect-[4/5] overflow-hidden bg-light-surface dark:bg-dark-surface ${framed ? '' : 'rounded-design-card'}`}>
            {pictures}
            {product.soldOut && <SoldOut className="absolute top-3 start-3" />}
          </div>
        </a>
        {dots}
      </div>
      <a {...linkOf(product)} className={`block ${framed ? 'flex-1 px-3 pb-4' : ''}`}>
        <h3 className="mt-3 px-1 font-medium text-light-text dark:text-dark-text break-words">{product.name}</h3>
        <Price product={product} currency={currency} className="mt-0.5 text-light-text/75 dark:text-dark-text/75" />
      </a>
      {card === 'button' && <div className="mt-auto pt-3"><CardButton product={product} pages={pages} cta={cta} /></div>}
    </article>
  );
};

export const SwapTiles: React.FC<TilesProps> = ({ items, pages, currency, card, cta, tone }) => {
  const few = items.length < FEW;
  const style = cardOf(card);
  // LT-588: the two cards that bring their own pictures and buttons draw as they are.
  if (style === 'reveal' || style === 'options') return <WellTiles items={items} pages={pages} currency={currency} card={style} cta={cta} tone={tone} />;
  return (
    <div className={few ? FEW_ROW : 'grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-4'} data-testid="products-swap" data-card={style}>
      {items.map((product) => (
        <div key={product.id} className={few ? FEW_SWAP_ITEM : undefined}>
          <SwapTile product={product} pages={pages} currency={currency} card={style} cta={cta} />
        </div>
      ))}
    </div>
  );
};

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

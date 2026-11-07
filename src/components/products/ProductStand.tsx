import React, { useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStill } from '../../hooks/useA11yPrefs';
import { PRODUCTS_PATH } from '../../models/Product';
import { followLink, useSiteNav } from '../../services/siteNav';
import { LIFT, liftBack, wayBack } from '../../services/productLift';
import ImagesService from '../../services/ImagesService';
import { handleSquareImageError } from '../../utils/imageFallback';
import { Price, ProductActions, SoldOut, altOfImage, type ProductLookProps } from './ProductParts';
import { ShelfBoard, StandingPicture } from './Standing';

/** The picture's own name for the move from the wall (productLift). */
const LIFTED = { viewTransitionName: LIFT } as React.CSSProperties;

/**
 * LT-605 'stand' (gallery's own, the product page of Erel's product shelf): the
 * product standing on a white ledge at one side - the one that left its place
 * on the wall comes here, and the way back sets it down there again - and at
 * the other its words: the category, the name, the line under it, the price,
 * the description, the sizes as cards, the colours, the main button and its
 * details. More than one picture: a sideways swipe or the dots under the
 * ledge. The reference's quantity, bag, stars and delivery lines stay out:
 * no fact here is one the owner did not give.
 */
const ProductStand: React.FC<ProductLookProps> = ({ product, currency, phone, cta, choice, onChoice, businessName, logo, listTitle, share, copied, actionsRef }) => {
  const { t, language } = useLanguage();
  const { go } = useSiteNav();
  const still = useStill();
  const rtl = language === 'he' || language === 'ar';
  const [at, setAt] = useState(0);
  const [moved, setMoved] = useState(false);
  const [open, setOpen] = useState(true);
  const drag = useRef<{ x: number; id: number } | null>(null);
  const images = product.images;
  const image = images[Math.min(at, images.length - 1)];
  const back = wayBack(product.slug, PRODUCTS_PATH);
  const Back = rtl ? ChevronRight : ChevronLeft;
  const colors = product.colors ?? [];
  const sizes = product.sizes ?? [];

  const show = (i: number) => {
    setMoved(true);
    setAt(((i % images.length) + images.length) % images.length);
  };
  const onDown = (e: React.PointerEvent) => {
    if (images.length > 1) drag.current = { x: e.clientX, id: e.pointerId };
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) < 40) return;
    // A swipe towards the reading's start brings the next picture.
    show(at + ((rtl ? dx > 0 : dx < 0) ? 1 : -1));
  };

  const card = 'flex cursor-pointer items-center justify-center rounded-xl border bg-light-surface px-4 py-3.5 text-[15px] font-medium transition-[border-color,box-shadow] duration-150 focus-within:ring-2 focus-within:ring-primary dark:bg-dark-surface dark:focus-within:ring-primary-dark';

  return (
    <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-14" data-testid="product-stand">
      <div className="flex flex-col items-center md:sticky md:top-[calc(var(--nav-offset,0px)_+_1.5rem)]">
        <div
          className="relative z-[1] aspect-[4/5] h-[44vh] max-h-[36rem] min-h-[16rem] touch-pan-y select-none md:h-[62vh]"
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={() => { drag.current = null; }}
        >
          <StandingPicture
            key={image?.url ?? 'none'}
            image={image}
            alt={image ? altOfImage(product, image) : product.name}
            eager
            style={moved && !still ? { ...LIFTED, animation: 'lt-rise 0.4s ease-out both' } : LIFTED}
          />
          {product.soldOut && <SoldOut className="absolute top-3 start-3 z-[2]" />}
        </div>
        <ShelfBoard className="-mt-1.5 w-[86%]" />
        {images.length > 1 && (
          <div className="mt-6 flex gap-1" role="group" aria-label={t('products.pictures')}>
            {images.map((img, i) => (
              <button key={img.url} type="button" onClick={() => show(i)} aria-label={t('products.picture', { index: i + 1 })} aria-current={i === at || undefined} className="flex h-6 w-6 items-center justify-center">
                <span className={`block h-2 w-2 rounded-full transition-colors ${i === at ? 'bg-light-text dark:bg-dark-text' : 'bg-light-text/25 hover:bg-light-text/50 dark:bg-dark-text/25'}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="text-light-text dark:text-dark-text">
        <a
          href={back}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            liftBack(product.slug, back, go, still);
          }}
          className="-ms-1.5 mb-6 inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[15px] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Back className="h-4 w-4" aria-hidden="true" />
          <span className="break-words">{listTitle?.trim() || t('products.allListings')}</span>
        </a>
        {product.category && <p className="text-sm text-light-text/65 break-words dark:text-dark-text/65">{product.category}</p>}
        <h1 className="mt-1 font-semibold tracking-tight break-words" style={{ fontSize: 'clamp(1.9rem, 1.4rem + 1.8vw, 2.6rem)', lineHeight: 1.08 }}>{product.name}</h1>
        {product.summary && <p className="mt-2 text-lg leading-snug text-light-text/70 break-words dark:text-dark-text/70">{product.summary}</p>}
        <Price product={product} currency={currency} className="mt-6 text-2xl font-semibold" />
        {product.description && product.description !== product.summary && (
          <p className="mt-4 max-w-[54ch] whitespace-pre-line text-[17px] leading-relaxed text-light-text/85 break-words dark:text-dark-text/85">{product.description}</p>
        )}

        {sizes.length > 0 && (
          <fieldset className="mt-7">
            <legend className="mb-2.5 text-base font-semibold">{t('products.size')}</legend>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {sizes.map((size) => {
                const on = choice.size === size;
                return (
                  <label key={size} className={`${card} ${on ? 'border-light-text shadow-[0_0_0_1px_currentColor] dark:border-dark-text' : 'border-light-text/20 hover:border-light-text/50 dark:border-dark-text/20 dark:hover:border-dark-text/50'}`}>
                    <input type="radio" name={`size-${product.id}`} value={size} checked={on} onChange={() => onChoice({ ...choice, size })} className="sr-only" />
                    <span className="break-words text-center">{size}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {colors.length > 0 && (
          <fieldset className="mt-6">
            <legend className="mb-2.5 text-base font-semibold">
              {t('products.color')}{choice.color ? <span className="font-normal text-light-text/70 dark:text-dark-text/70">: {choice.color}</span> : null}
            </legend>
            <div className="flex flex-wrap gap-3">
              {colors.map((color) => {
                const on = choice.color === color.name;
                return (
                  <label key={color.name} title={color.name} className={`relative h-10 w-10 cursor-pointer rounded-full border border-black/15 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 dark:border-white/20 ${on ? 'ring-2 ring-light-text ring-offset-2 ring-offset-light-bg dark:ring-dark-text dark:ring-offset-dark-bg' : ''}`} style={{ backgroundColor: color.hex }}>
                    <input type="radio" name={`color-${product.id}`} value={color.name} checked={on} onChange={() => onChoice({ ...choice, color: color.name })} className="sr-only" aria-label={color.name} />
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        <div ref={actionsRef}>
          <ProductActions product={product} phone={phone} label={cta} choice={choice} className="mt-7 [&>a]:flex-1" />
        </div>

        {product.details.length > 0 && (
          <div className="mt-8 border-y border-light-text/15 dark:border-dark-text/15">
            <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 py-4 text-start text-[17px] font-semibold">
              {t('products.detailsTitle')}
              <ChevronDown className={`h-5 w-5 shrink-0 text-light-text/60 transition-transform duration-300 dark:text-dark-text/60 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {open && (
              <ul className="list-disc space-y-1 pb-5 ps-5 text-[15px] leading-relaxed text-light-text/80 dark:text-dark-text/80">
                {product.details.map((detail) => <li key={detail} className="break-words">{detail}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className={`flex items-center justify-between gap-4 ${product.details.length ? 'pt-6' : 'mt-8 border-t border-light-text/15 pt-6 dark:border-dark-text/15'}`}>
          <a href="/" onClick={(e) => followLink(e, '/', go)} className="flex min-w-0 items-center gap-3">
            {logo && <img src={ImagesService.getInstance().getImage(logo)} alt="" onError={handleSquareImageError} className="h-11 w-11 shrink-0 rounded-full object-cover" />}
            <span className="min-w-0 font-semibold break-words">{businessName}</span>
          </a>
          <button type="button" onClick={share} className="inline-flex shrink-0 items-center gap-2 text-sm font-medium hover:text-primary dark:hover:text-primary-dark transition-colors">
            {copied ? <Check className="h-5 w-5" aria-hidden="true" /> : <Share2 className="h-5 w-5" aria-hidden="true" />}
            {copied ? t('products.copied') : t('products.share')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductStand;

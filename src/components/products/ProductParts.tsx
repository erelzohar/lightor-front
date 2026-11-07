import React, { useState } from 'react';
import { MessageCircle, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { productPath, productPrice, type Product, type ProductCard, type ProductImage } from '../../models/Product';
import { choiceText, productAction, useProductInquiry, type ProductChoice } from '../../services/productAction';
import { followLink, useSiteNav } from '../../services/siteNav';
import { scrollToSection, sectionOf } from '../../utils/sections';
import ImagesService from '../../services/ImagesService';
import { handleSquareImageError } from '../../utils/imageFallback';
import { whatsAppHref } from '../../utils/phone';

export const imageUrl = (image: ProductImage | undefined): string =>
  image ? ImagesService.getInstance().getImage(image.url) : '';

/** What a product's picture says: the owner's words, else its name. */
export const altOfImage = (product: Pick<ProductCard, 'name'>, image?: ProductImage): string =>
  image?.alt?.trim() || product.name;

/** To the form itself, not the top of its section: the visitor came to write. */
export const toTheForm = (): void => {
  const target = document.querySelector('#contact form') ?? sectionOf('#contact');
  if (target) scrollToSection(target);
};

/** LT-545: a product's page opened at its form, the product chosen (a card's own button). */
export const INQUIRE_HASH = '#inquire';

/**
 * Where a product's tile leads: its own page, or on a site whose products have
 * none, the contact form with the product already chosen. `inquire` opens the
 * page at its form.
 */
export const useProductLink = (pages: boolean, inquire = false, choice?: ProductChoice) => {
  const { go } = useSiteNav();
  const { setInquiry } = useProductInquiry();
  return (product: ProductCard) => {
    const href = pages ? `${productPath(product)}${inquire ? INQUIRE_HASH : ''}` : '#contact';
    return {
      href,
      onClick: (e: React.MouseEvent) => {
        if (pages) { followLink(e, href, go); return; }
        e.preventDefault();
        // LT-588: with the colour and size the visitor picked on the card.
        setInquiry({ id: product.id, name: product.name, ...(choiceText(choice) ? { choice } : {}) });
        toTheForm();
      },
    };
  };
};

/** A product's first picture, filling its box; a product with none shows a quiet mark. */
export const CoverImage: React.FC<{ product: ProductCard; className?: string; alt?: string; eager?: boolean; onError?: React.ReactEventHandler<HTMLImageElement> }> = ({ product, className = '', alt, eager = false, onError = handleSquareImageError }) => {
  const image = product.images[0];
  return image
    ? <img src={imageUrl(image)} alt={alt ?? altOfImage(product, image)} loading={eager ? 'eager' : 'lazy'} draggable={false} onError={onError} className={`h-full w-full object-cover ${className}`} />
    : <span className="flex h-full w-full items-center justify-center text-light-text/30 dark:text-dark-text/30"><ShoppingBag className="h-1/3 w-1/3" aria-hidden="true" /></span>;
};

export const Price: React.FC<{ product: Pick<ProductCard, 'price'>; currency?: string; className?: string }> = ({ product, currency, className = '' }) => {
  const shown = productPrice(product.price, currency);
  return shown ? <span dir="ltr" className={`inline-block ${className}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{shown}</span> : null;
};

export const SoldOut: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useLanguage();
  return (
    <span className={`inline-block rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white ${className}`}>
      {t('products.soldOut')}
    </span>
  );
};

/**
 * The product's main button and WhatsApp beside it. What the main button does
 * comes from `productAction`, for one product as for the whole catalogue.
 */
export const ProductActions: React.FC<{ product: ProductCard; phone?: string; label?: string; className?: string; choice?: ProductChoice }> = ({ product, phone, label, className = '', choice }) => {
  const { t } = useLanguage();
  const { setInquiry } = useProductInquiry();
  // LT-588: the colour and size the visitor picked go with the inquiry and the WhatsApp words.
  const picked = choiceText(choice);
  const wa = whatsAppHref(phone, t('products.whatsappText', { name: picked ? `${product.name} (${picked})` : product.name }));
  const action = productAction(product);
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {action === 'inquire' && (
        <a
          href="#contact"
          onClick={(e) => {
            e.preventDefault();
            setInquiry({ id: product.id, name: product.name, ...(picked ? { choice } : {}) });
            toTheForm();
          }}
          className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-design bg-primary dark:bg-primary-dark px-7 py-3.5 font-bold text-on-primary dark:text-on-primary-dark hover:opacity-90 transition-opacity"
        >
          <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          {label?.trim() || t('products.cta')}
        </a>
      )}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-design border-2 border-light-text/20 dark:border-dark-text/20 px-7 py-3 font-semibold text-light-text dark:text-dark-text hover:border-primary dark:hover:border-primary-dark transition-colors"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          {t('products.whatsapp')}
        </a>
      )}
    </div>
  );
};

/**
 * A product's pictures: one large, the rest to pick from. LT-545: the large
 * one's frame and the row under it can be the page's own ('hero').
 */
export const ProductPictures: React.FC<{ product: ProductCard; className?: string; eager?: boolean; frameClassName?: string; thumbsClassName?: string }> = ({ product, className = '', eager = false, frameClassName = 'aspect-[4/5] rounded-design-card', thumbsClassName = '' }) => {
  const { t } = useLanguage();
  const [shown, setShown] = useState(0);
  const images = product.images;
  const main = images[Math.min(shown, images.length - 1)];
  if (!main) return null;
  return (
    <div className={className}>
      <div className={`relative overflow-hidden bg-light-surface dark:bg-dark-surface ${frameClassName}`}>
        <img
          src={imageUrl(main)}
          alt={altOfImage(product, main)}
          loading={eager ? 'eager' : 'lazy'}
          onError={handleSquareImageError}
          className="h-full w-full object-cover"
        />
        {product.soldOut && <SoldOut className="absolute top-3 start-3" />}
      </div>
      {images.length > 1 && (
        <div className={`mt-3 flex flex-wrap gap-2 ${thumbsClassName}`} role="group" aria-label={t('products.pictures')}>
          {images.map((image, i) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setShown(i)}
              aria-label={t('products.picture', { index: i + 1 })}
              aria-current={i === shown || undefined}
              className={`h-16 w-16 overflow-hidden rounded-design-sm border-2 transition-colors ${i === shown ? 'border-primary dark:border-primary-dark' : 'border-transparent opacity-70 hover:opacity-100'}`}
            >
              <img src={imageUrl(image)} alt="" loading="lazy" onError={handleSquareImageError} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * LT-588 (Erel's card with colours and sizes): what the product comes in, to
 * pick. A swatch says its colour's name; the pick goes with the inquiry.
 */
export const ProductOptions: React.FC<{ product: Pick<ProductCard, 'colors' | 'sizes'>; choice: ProductChoice; onChange: (choice: ProductChoice) => void; compact?: boolean; className?: string }> = ({ product, choice, onChange, compact = false, className = '' }) => {
  const { t } = useLanguage();
  const colors = product.colors ?? [];
  const sizes = product.sizes ?? [];
  if (!colors.length && !sizes.length) return null;
  const label = `text-light-text/70 dark:text-dark-text/70 ${compact ? 'text-xs' : 'text-sm'}`;
  return (
    <div className={`space-y-3 ${className}`}>
      {colors.length > 0 && (
        <div className="space-y-1.5">
          <p className={label}>
            {t('products.color')}{choice.color ? <span className="text-light-text dark:text-dark-text">: {choice.color}</span> : null}
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('products.color')}>
            {colors.map((color) => {
              const on = choice.color === color.name;
              return (
                <button
                  key={color.name}
                  type="button"
                  title={color.name}
                  aria-label={color.name}
                  aria-pressed={on}
                  onClick={() => onChange({ ...choice, color: on ? undefined : color.name })}
                  className={`${compact ? 'h-6 w-6' : 'h-8 w-8'} rounded-full border border-black/15 transition-shadow dark:border-white/20 ${on ? 'ring-2 ring-primary ring-offset-2 ring-offset-light-bg dark:ring-primary-dark dark:ring-offset-dark-bg' : 'hover:ring-1 hover:ring-primary dark:hover:ring-primary-dark'}`}
                  style={{ backgroundColor: color.hex }}
                />
              );
            })}
          </div>
        </div>
      )}
      {sizes.length > 0 && (
        <div className="space-y-1.5">
          <p className={label}>{t('products.size')}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('products.size')}>
            {sizes.map((size) => {
              const on = choice.size === size;
              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange({ ...choice, size: on ? undefined : size })}
                  className={`min-w-[2.5rem] rounded-design-sm px-2 font-medium transition-colors break-words ${compact ? 'min-h-8 py-1 text-xs' : 'min-h-10 py-2 text-sm'} ${on ? 'bg-primary text-on-primary dark:bg-primary-dark dark:text-on-primary-dark' : 'bg-light-text/[0.07] text-light-text hover:bg-light-text/15 dark:bg-dark-text/10 dark:text-dark-text dark:hover:bg-dark-text/20'}`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * LT-605: what a product page's look draws from (the looks in their own files,
 * 'stand' and 'stage'); the page itself loads the product and keeps the pick.
 */
export interface ProductLookProps {
  product: Product;
  currency?: string;
  phone?: string;
  cta?: string;
  choice: ProductChoice;
  onChoice: (choice: ProductChoice) => void;
  businessName: string;
  logo?: string;
  listTitle?: string;
  share: () => void;
  copied: boolean;
  /** The main button's row: the page watches it (the phone's handy button). */
  actionsRef: React.RefObject<HTMLDivElement>;
}

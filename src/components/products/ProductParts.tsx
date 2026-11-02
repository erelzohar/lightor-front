import React, { useState } from 'react';
import { MessageCircle, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { productPath, productPrice, type ProductCard, type ProductImage } from '../../models/Product';
import { productAction, useProductInquiry } from '../../services/productAction';
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
export const useProductLink = (pages: boolean, inquire = false) => {
  const { go } = useSiteNav();
  const { setInquiry } = useProductInquiry();
  return (product: ProductCard) => {
    const href = pages ? `${productPath(product)}${inquire ? INQUIRE_HASH : ''}` : '#contact';
    return {
      href,
      onClick: (e: React.MouseEvent) => {
        if (pages) { followLink(e, href, go); return; }
        e.preventDefault();
        setInquiry({ id: product.id, name: product.name });
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
export const ProductActions: React.FC<{ product: ProductCard; phone?: string; label?: string; className?: string }> = ({ product, phone, label, className = '' }) => {
  const { t } = useLanguage();
  const { setInquiry } = useProductInquiry();
  const wa = whatsAppHref(phone, t('products.whatsappText', { name: product.name }));
  const action = productAction(product);
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {action === 'inquire' && (
        <a
          href="#contact"
          onClick={(e) => {
            e.preventDefault();
            setInquiry({ id: product.id, name: product.name });
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

import React, { forwardRef, type CSSProperties } from 'react';
import { ShoppingBag } from 'lucide-react';
import type { ProductImage } from '../../models/Product';
import { useCutout } from '../../utils/cutout';
import { handleSquareImageError } from '../../utils/imageFallback';
import { imageUrl } from './ProductParts';
import './Standing.css';

interface StandingProps {
  image?: ProductImage;
  alt?: string;
  eager?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * LT-605: a product standing on a ledge (Erel's product shelf). A picture with
 * see-through corners (a cut-out) stands on its own over a contact shadow, as
 * the reference's packs do; a photo stands as a framed print in a light mount,
 * leaning on the ledge. Both fill the box they are given, feet on its floor.
 */
export const StandingPicture = forwardRef<HTMLSpanElement, StandingProps>(({ image, alt = '', eager = false, className = '', style }, ref) => {
  const src = imageUrl(image);
  const cutout = useCutout(src);
  const loading = eager ? 'eager' : 'lazy';
  if (!src) {
    return (
      <span ref={ref} style={style} className={`relative flex h-full w-full items-end justify-center ${className}`}>
        <span className="lt-stand-frame flex h-[80%] w-[72%] items-center justify-center text-light-text/30 dark:text-dark-text/30">
          <ShoppingBag className="h-1/3 w-1/3" aria-hidden="true" />
        </span>
      </span>
    );
  }
  return (
    <span ref={ref} style={style} className={`relative flex h-full w-full items-end justify-center ${className}`} data-cutout={cutout || undefined}>
      {cutout ? (<>
        <img src={src} alt={alt} loading={loading} draggable={false} onError={handleSquareImageError} className="relative z-[1] max-h-full max-w-full object-contain object-bottom" />
        <span className="lt-stand-contact" aria-hidden="true" />
      </>) : (
        <span className="lt-stand-frame block h-[92%] w-[82%]">
          <img src={src} alt={alt} loading={loading} draggable={false} onError={handleSquareImageError} className="h-full w-full object-cover" />
        </span>
      )}
    </span>
  );
});
StandingPicture.displayName = 'StandingPicture';

/** The floating shelf: a lit top, a crisp front edge and a soft shadow on the wall under it. */
export const ShelfBoard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div aria-hidden="true" className={`lt-shelf relative h-4 ${className}`}>
    <span className="lt-shelf-top" />
    <span className="lt-shelf-edge" />
    <span className="lt-shelf-shadow" />
  </div>
);

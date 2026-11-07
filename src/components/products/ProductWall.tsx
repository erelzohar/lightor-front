import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStill } from '../../hooks/useA11yPrefs';
import { productPrice, type ProductCard } from '../../models/Product';
import { useSiteNav } from '../../services/siteNav';
import { LIFT, afterMove, comingBack, liftTo } from '../../services/productLift';
import { rememberCards } from '../../services/productCards';
import { Price, SoldOut, useProductLink } from './ProductParts';
import { ShelfBoard, StandingPicture } from './Standing';

const WIDE = '(min-width: 1024px)';
const MID = '(min-width: 640px)';

const matches = (query: string): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;

/** How many stand on one shelf: two on a phone, three on a tablet, four wider. */
export const useShelfSize = (): number => {
  const read = () => (matches(WIDE) ? 4 : matches(MID) ? 3 : 2);
  const [size, setSize] = useState(read);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const lists = [WIDE, MID].map((q) => window.matchMedia(q));
    const onChange = () => setSize(read());
    lists.forEach((m) => (m.addEventListener ? m.addEventListener('change', onChange) : m.addListener(onChange)));
    return () => lists.forEach((m) => (m.removeEventListener ? m.removeEventListener('change', onChange) : m.removeListener(onChange)));
  }, []);
  return size;
};

export const shelvesOf = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/** One place on a shelf: the same width whether the shelf is full or not, so a short shelf stays centred. */
const placeWidth = (size: number): React.CSSProperties => ({ width: `calc((100% - ${size - 1} * var(--wall-gap)) / ${size})` });

const WallItem: React.FC<{ product: ProductCard; pages: boolean; currency?: string; eager: boolean; size: number }> = ({ product, pages, currency, eager, size }) => {
  const { go } = useSiteNav();
  const still = useStill();
  const link = useProductLink(pages)(product);
  const picture = useRef<HTMLSpanElement>(null);

  // Back from its page: this place takes the picture back (the move's other end).
  useLayoutEffect(() => {
    const el = picture.current;
    if (!el || !comingBack(product.slug)) return;
    el.style.setProperty('view-transition-name', LIFT);
    void afterMove().then(() => el.style.removeProperty('view-transition-name'));
  }, [product.slug]);

  const price = productPrice(product.price, currency);
  const onClick = (e: React.MouseEvent) => {
    if (!pages) { link.onClick(e); return; }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    liftTo(picture.current, product.slug, link.href, go, still);
  };

  return (
    <li className="shrink-0" style={placeWidth(size)}>
      <a
        href={link.href}
        onClick={onClick}
        aria-label={price ? `${product.name}, ${price}` : product.name}
        className="group relative block aspect-[4/5] rounded-design-sm outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-light-bg dark:focus-visible:ring-primary-dark dark:focus-visible:ring-offset-dark-bg"
        data-testid="wall-product"
      >
        <StandingPicture ref={picture} image={product.images[0]} eager={eager} className="transition-transform duration-300 ease-out [@media(hover:hover)]:group-hover:-translate-y-1.5" />
        {product.soldOut && <SoldOut className="absolute top-2 start-2 z-[2]" />}
      </a>
    </li>
  );
};

interface Props {
  items: ProductCard[];
  /** The products have pages of their own (else a tap asks about the product in the form). */
  pages: boolean;
  currency?: string;
  id?: string;
  testId?: string;
}

/**
 * LT-605 'wall' (gallery's own, from Erel's product shelf): a store wall of
 * floating shelves, the products standing on them, each name and price under
 * its shelf. A product lifts a little when pointed at; a tap carries it to its
 * page (productLift: the browser's own move, where it has one) and the way
 * back sets it down in its place. Still otherwise: free on every plan.
 */
const ProductWall: React.FC<Props> = ({ items, pages, currency, id, testId = 'products-wall' }) => {
  const size = useShelfSize();
  useEffect(() => { rememberCards(items); }, [items]);
  const shelves = shelvesOf(items, size);
  return (
    <div id={id} className="lt-wall space-y-14 md:space-y-16 [--wall-gap:1rem] sm:[--wall-gap:2rem]" data-testid={testId}>
      {shelves.map((shelf, row) => (
        <div key={row} data-testid="wall-shelf">
          <ul role="list" className="relative z-[1] flex items-end justify-center gap-x-[var(--wall-gap)] px-2 sm:px-6">
            {shelf.map((p) => <WallItem key={p.id} product={p} pages={pages} currency={currency} eager={row === 0} size={size} />)}
          </ul>
          <ShelfBoard className="-mt-1.5" />
          <div aria-hidden="true" className="mt-5 flex justify-center gap-x-[var(--wall-gap)] px-2 text-light-text sm:px-6 dark:text-dark-text">
            {shelf.map((p) => (
              <div key={p.id} className="shrink-0 text-center" style={placeWidth(size)}>
                <p className="text-sm font-medium leading-tight break-words md:text-base">{p.name}</p>
                <Price product={p} currency={currency} className="mt-1 text-sm text-light-text/65 dark:text-dark-text/65" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductWall;

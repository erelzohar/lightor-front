import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useEdit } from '../../services/editMode';
import { followLink, useSiteNav } from '../../services/siteNav';
import { PRODUCTS_PATH, type Product, type ProductCard, type ProductsSummary } from '../../models/Product';
import type { ProductCardStyle, ProductsLayout, SectionHeader } from '../../models/DesignConfig';
import type { HeadingScale } from '../../services/artDirection';
import type { SectionTone } from '../SectionDivider';
import { TONE_BG } from '../blocks/blockUtils';
import SectionHeading from '../Layout/SectionHeading';
import { BentoTiles, ListTiles, SwapTiles, WellTiles } from './ProductTiles';
import ProductBelt from './ProductBelt';
import ProductRail from './ProductRail';
import ProductCoverflow from './ProductCoverflow';
import ProductOrbit from './ProductOrbit';
import ProductFeature from './ProductFeature';

interface Props {
  summary?: ProductsSummary;
  config?: { title: string; description: string; cta: string };
  layout?: ProductsLayout;
  /** LT-545: the owner's card, for the layouts that draw cards. */
  card?: ProductCardStyle;
  currency?: string;
  phone?: string;
  header?: SectionHeader;
  headerScale?: HeadingScale;
  tone?: SectionTone;
}

/** The fewest a moving layout needs to read as what it is; under that, calm tiles. */
const MIN_ITEMS: Partial<Record<ProductsLayout, number>> = { belt: 4, hanger: 3, coverflow: 3, orbit: 3 };

export const tilesFor = (layout: ProductsLayout, count: number): ProductsLayout =>
  count < (MIN_ITEMS[layout] ?? 0) ? 'well' : layout;

/** The arrangements a full list can take: the moving ones suit a handful, not a catalogue. */
export const ProductList: React.FC<{ items: ProductCard[]; layout: ProductsLayout; pages: boolean; currency?: string; tone?: SectionTone; card?: ProductCardStyle; cta?: string }> = ({ items, layout, ...rest }) => {
  const Tiles = layout === 'swap' ? SwapTiles : layout === 'bento' ? BentoTiles : layout === 'list' ? ListTiles : WellTiles;
  return <Tiles items={items} {...rest} />;
};

/**
 * LT-540: the products section. It stands where a gallery stands; a product is
 * not a gallery row (an order will point at it for good), but the place on the
 * page is the same. One product is drawn in full: the home page is its page.
 */
const Products: React.FC<Props> = ({ summary, config, layout = 'well', card, currency, phone, header, headerScale, tone = 'bg' }) => {
  const { t, language } = useLanguage();
  const { editing } = useEdit();
  const { go } = useSiteNav();
  const items: Product[] = summary?.items ?? [];
  if (!items.length && !editing) return null;

  const pages = !!summary?.pages;
  const title = config?.title?.trim() || t('products.title');
  const Arrow = language === 'he' || language === 'ar' ? ArrowLeft : ArrowRight;
  const shown = tilesFor(layout, items.length);

  return (
    <section id="products" className={`section-y ${TONE_BG[tone]} transition-colors duration-300 ${shown === 'orbit' && items.length > 1 ? 'lt-clip-x' : ''}`} aria-label={title}>
      <div className="container mx-auto px-4">
        <SectionHeading
          title={title}
          description={config?.description || undefined}
          titlePath="components.products.title"
          descriptionPath="components.products.description"
          variant={header}
          scale={headerScale}
          mb="mb-10 md:mb-14"
          descClass="text-xl text-light-text/80 dark:text-dark-text/80 max-w-2xl mx-auto"
        />
        {!items.length ? (
          <div className="rounded-design-card border-2 border-dashed border-light-text/25 dark:border-dark-text/25 px-6 py-16 text-center text-lg text-light-text/70 dark:text-dark-text/70" data-testid="products-empty">
            {t('products.empty_edit')}
          </div>
        ) : items.length === 1 ? (
          <ProductFeature product={items[0]} currency={currency} phone={phone} cta={config?.cta} />
        ) : shown === 'belt' ? (
          <ProductBelt items={items} pages={pages} currency={currency} />
        ) : shown === 'hanger' ? (
          <ProductRail items={items} pages={pages} currency={currency} />
        ) : shown === 'coverflow' ? (
          <ProductCoverflow items={items} pages={pages} currency={currency} />
        ) : shown === 'orbit' ? (
          <ProductOrbit items={items} pages={pages} currency={currency} tone={tone} cta={config?.cta} />
        ) : (
          <ProductList items={items} layout={shown} pages={pages} currency={currency} tone={tone} card={card} cta={config?.cta} />
        )}
        {/* LT-542 (Erel): the way to the products' page, whenever the site has one. */}
        {pages && (
          <div className="mt-10 text-center">
            <a
              href={PRODUCTS_PATH}
              onClick={(e) => followLink(e, PRODUCTS_PATH, go)}
              className="inline-flex items-center gap-2 rounded-design border-2 border-primary dark:border-primary-dark px-7 py-3 font-bold text-primary dark:text-primary-dark hover:bg-primary hover:text-on-primary dark:hover:bg-primary-dark dark:hover:text-on-primary-dark transition-colors"
            >
              {t('products.all', { count: summary?.total })}
              <Arrow className="h-5 w-5" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </section>
  );
};

export default Products;

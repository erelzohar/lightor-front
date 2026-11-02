import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { categoriesOf, parseProduct, type ProductCard } from '../../models/Product';
import type { ProductCardStyle, ProductsLayout } from '../../models/DesignConfig';
import WebConfigService from '../../services/WebConfigService';
import { readInlinePage } from '../../services/edgeShell';
import { followLink, useSiteNav } from '../../services/siteNav';
import { ProductList, tilesFor } from './Products';
import Loading from '../Loading';

interface Props {
  businessName: string;
  title?: string;
  description?: string;
  layout?: ProductsLayout;
  /** LT-545: the owner's card, and the words on its button. */
  card?: ProductCardStyle;
  cta?: string;
  currency?: string;
}

/** The moving layouts suit a handful of products; a whole catalogue sits in calm tiles. */
const STILL_LAYOUTS: ProductsLayout[] = ['well', 'swap', 'bento', 'list'];

/**
 * LT-540: `/products`: everything the site shows, filtered by category. It is
 * reached past what the home page holds, and in the site's own frame.
 */
const ProductsPage: React.FC<Props> = ({ businessName, title, description, layout = 'well', card, cta, currency }) => {
  const { t } = useLanguage();
  const { go } = useSiteNav();
  const [items, setItems] = useState<ProductCard[] | null>(() => {
    const inline = readInlinePage('products');
    return Array.isArray(inline) ? inline.map(parseProduct).filter((p): p is NonNullable<typeof p> => !!p) : null;
  });
  const [failed, setFailed] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const heading = title?.trim() || t('products.title');

  useEffect(() => {
    if (items) return;
    WebConfigService.getInstance().getProducts(window.location.hostname.split('.')[0])
      .then(setItems)
      .catch(() => setFailed(true));
  }, [items]);

  useEffect(() => {
    const before = document.title;
    document.title = `${heading} | ${businessName}`;
    return () => { document.title = before; };
  }, [heading, businessName]);

  if (failed) return <p className="section-y text-center text-light-text dark:text-dark-text">{t('products.failed')}</p>;
  if (!items) return <Loading isLoading={true} />;

  const categories = categoriesOf(items);
  const shown = category ? items.filter((p) => p.category === category) : items;
  const arrangement = STILL_LAYOUTS.includes(layout) ? tilesFor(layout, shown.length) : 'well';
  const chip = (on: boolean) => `rounded-full border px-4 py-2 text-sm font-medium transition-colors ${on
    ? 'border-primary bg-primary text-on-primary dark:border-primary-dark dark:bg-primary-dark dark:text-on-primary-dark'
    : 'border-light-text/20 text-light-text hover:border-primary dark:border-dark-text/20 dark:text-dark-text dark:hover:border-primary-dark'}`;

  return (
    <section className="bg-light-bg dark:bg-dark-bg pb-20" style={{ paddingTop: 'calc(var(--nav-offset, 0px) + 2.5rem)' }}>
      <div className="container mx-auto px-4">
        <nav aria-label={t('products.breadcrumbs')} className="mb-4 text-sm text-light-text/70 dark:text-dark-text/70">
          <a href="/" onClick={(e) => followLink(e, '/', go)} className="hover:text-primary dark:hover:text-primary-dark">{t('nav.home')}</a>
        </nav>
        <h1 className="text-4xl font-bold text-light-text dark:text-dark-text break-words md:text-5xl">{heading}</h1>
        {description && <p className="mt-3 max-w-2xl text-lg text-light-text/80 dark:text-dark-text/80">{description}</p>}
        {categories.length > 1 && (
          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label={t('products.categories')}>
            <button type="button" className={chip(category === null)} aria-pressed={category === null} onClick={() => setCategory(null)}>{t('products.allCategories')}</button>
            {categories.map((name) => (
              <button key={name} type="button" className={chip(category === name)} aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>
            ))}
          </div>
        )}
        <div className="mt-8">
          <ProductList items={shown} layout={arrangement} pages currency={currency} card={card} cta={cta} />
        </div>
      </div>
    </section>
  );
};

export default ProductsPage;

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { groupsOf, parseProduct, type ProductCard } from '../../models/Product';
import type { ProductCardStyle, ProductsLayout, ProductsPageLayout } from '../../models/DesignConfig';
import WebConfigService from '../../services/WebConfigService';
import { readInlinePage } from '../../services/edgeShell';
import { followLink, useSiteNav } from '../../services/siteNav';
import { scrollToSection } from '../../utils/sections';
import { ProductList, tilesFor } from './Products';
import { ProductRow, ProductShelf } from './ProductShelves';
import ProductShop from './ProductShop';
import Loading from '../Loading';
import { part } from '../../designs/parts';
import { lastList, rememberList } from '../../services/productCards';

// LT-605: the wall of shelves, gallery's own.
const ProductWall = part('productWall', (m) => m.default);

interface Props {
  businessName: string;
  title?: string;
  description?: string;
  layout?: ProductsLayout | ProductsPageLayout;
  /** LT-545: the owner's card, and the words on its button. */
  card?: ProductCardStyle;
  cta?: string;
  currency?: string;
  /** LT-554: the wizard's sample products, in its preview: the list is them. */
  drafts?: ProductCard[];
}

/** The moving layouts suit a handful of products; a whole catalogue sits in calm tiles. */
const STILL_LAYOUTS: ProductsLayout[] = ['well', 'swap', 'bento', 'list'];
/** LT-588: the page's own arrangements, by category. */
const PAGE_LAYOUTS: ProductsPageLayout[] = ['rows', 'shelves', 'shop', 'wall'];

/** A category's place on the page, for the links that jump to it. */
const sectionId = (i: number): string => `products-cat-${i}`;

/**
 * LT-540: `/products`: everything the site shows. LT-587 (Erel: "divided by
 * category, not all thrown together"): each category is a section of its own,
 * with its name; the chips above jump to them. LT-588: as rows, shelves or a
 * shop with filters. `?category=` (a product page's "more of") opens at one.
 */
const ProductsPage: React.FC<Props> = ({ businessName, title, description, layout = 'well', card, cta, currency, drafts }) => {
  const { t } = useLanguage();
  const { go } = useSiteNav();
  const { search } = useLocation();
  const [fetched, setItems] = useState<ProductCard[] | null>(() => {
    const inline = readInlinePage('products');
    // LT-605: back from a product on this visit, the list is already in hand.
    return Array.isArray(inline) ? inline.map(parseProduct).filter((p): p is NonNullable<typeof p> => !!p) : lastList();
  });
  const items = drafts ?? fetched;
  const [failed, setFailed] = useState(false);
  const heading = title?.trim() || t('products.title');
  const wanted = new URLSearchParams(search).get('category');

  useEffect(() => {
    if (items) return;
    WebConfigService.getInstance().getProducts(window.location.hostname.split('.')[0])
      .then((list) => { if (list) rememberList(list); setItems(list); })
      .catch(() => setFailed(true));
  }, [items]);

  useEffect(() => {
    const before = document.title;
    document.title = `${heading} | ${businessName}`;
    return () => { document.title = before; };
  }, [heading, businessName]);

  const shape: ProductsPageLayout | null = PAGE_LAYOUTS.includes(layout as ProductsPageLayout) ? (layout as ProductsPageLayout) : null;
  const groups = items ? groupsOf(items) : [];
  const grouped = groups.length > 1;

  // A product page's "more of this category" lands on its section.
  useEffect(() => {
    if (!items || !wanted || shape === 'shop') return;
    const at = groupsOf(items).findIndex((g) => g.name === wanted);
    const el = at >= 0 ? document.getElementById(sectionId(at)) : null;
    if (el) scrollToSection(el, 'auto');
  }, [items, wanted, shape]);

  if (failed) return <p className="section-y text-center text-light-text dark:text-dark-text">{t('products.failed')}</p>;
  if (!items) return <Loading isLoading={true} />;

  const still = STILL_LAYOUTS.includes(layout as ProductsLayout) ? (layout as ProductsLayout) : 'well';
  const titleOf = (name: string) => name || t('products.uncategorized');
  const chip = 'rounded-full border border-light-text/20 px-4 py-2 text-sm font-medium text-light-text transition-colors hover:border-primary dark:border-dark-text/20 dark:text-dark-text dark:hover:border-primary-dark';
  const jumps = grouped && shape !== 'shop' && still !== 'list' && (
    <nav className="mt-6 flex flex-wrap gap-2" aria-label={t('products.categories')}>
      {groups.map((g, i) => (
        <a key={g.name || '-'} href={`#${sectionId(i)}`} className={chip} onClick={(e) => {
          const el = document.getElementById(sectionId(i));
          if (!el) return;
          e.preventDefault();
          scrollToSection(el);
        }}>{titleOf(g.name)}</a>
      ))}
    </nav>
  );

  const body = (() => {
    if (shape === 'shop') return <ProductShop items={items} currency={currency} card={card} cta={cta} initialCategory={wanted} />;
    if (shape === 'wall') {
      return (
        <div className="space-y-16">
          {groups.map((g, i) => (
            <section key={g.name || '-'} id={sectionId(i)} aria-labelledby={grouped ? `${sectionId(i)}-title` : undefined} className="scroll-mt-28" data-testid="products-category">
              {grouped && <h2 id={`${sectionId(i)}-title`} className="mb-8 text-2xl font-bold text-light-text break-words dark:text-dark-text md:text-3xl">{titleOf(g.name)}</h2>}
              <ProductWall items={g.items} pages currency={currency} />
            </section>
          ))}
        </div>
      );
    }
    if (shape === 'rows' || shape === 'shelves') {
      // One category or none: the shelf is the whole catalogue.
      return (
        <div className={shape === 'rows' ? 'space-y-10' : 'space-y-8'}>
          {groups.map((g, i) => shape === 'rows'
            ? <ProductRow key={g.name || '-'} id={sectionId(i)} title={grouped ? titleOf(g.name) : heading} items={g.items} pages currency={currency} />
            : <ProductShelf key={g.name || '-'} id={sectionId(i)} title={grouped ? titleOf(g.name) : undefined} subtitle={t('products.count', { count: g.items.length })} items={g.items} pages currency={currency} />)}
        </div>
      );
    }
    // The list draws its categories itself.
    if (still === 'list' || !grouped) return <ProductList items={items} layout={tilesFor(still, items.length)} pages currency={currency} card={card} cta={cta} />;
    return (
      <div className="space-y-14">
        {groups.map((g, i) => (
          <section key={g.name || '-'} id={sectionId(i)} aria-labelledby={`${sectionId(i)}-title`} className="scroll-mt-28" data-testid="products-category">
            <h2 id={`${sectionId(i)}-title`} className="mb-6 text-2xl font-bold text-light-text break-words dark:text-dark-text md:text-3xl">{titleOf(g.name)}</h2>
            <ProductList items={g.items} layout={tilesFor(still, g.items.length)} pages currency={currency} card={card} cta={cta} />
          </section>
        ))}
      </div>
    );
  })();

  return (
    <section className="bg-light-bg dark:bg-dark-bg pb-20" style={{ paddingTop: 'calc(var(--nav-offset, 0px) + 2.5rem)' }}>
      <div className="container mx-auto px-4">
        <nav aria-label={t('products.breadcrumbs')} className="mb-4 text-sm text-light-text/70 dark:text-dark-text/70">
          <a href="/" onClick={(e) => followLink(e, '/', go)} className="hover:text-primary dark:hover:text-primary-dark">{t('nav.home')}</a>
        </nav>
        <h1 className="text-4xl font-bold text-light-text dark:text-dark-text break-words md:text-5xl">{heading}</h1>
        {description && <p className="mt-3 max-w-2xl text-lg text-light-text/80 dark:text-dark-text/80">{description}</p>}
        {jumps}
        <div className="mt-10">{body}</div>
      </div>
    </section>
  );
};

export default ProductsPage;

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Share2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { PRODUCTS_PATH, parseProduct, type Product } from '../../models/Product';
import WebConfigService from '../../services/WebConfigService';
import { readInlinePage } from '../../services/edgeShell';
import { followLink, useSiteNav } from '../../services/siteNav';
import { useProductInquiry } from '../../services/productAction';
import ImagesService from '../../services/ImagesService';
import { handleSquareImageError } from '../../utils/imageFallback';
import NotFound from '../NotFound';
import Loading from '../Loading';
import { Price, ProductActions, ProductPictures } from './ProductParts';
import { WellTiles } from './ProductTiles';

interface Props {
  slug: string;
  businessName: string;
  logo?: string;
  phone?: string;
  currency?: string;
  /** The heading of the products' list, for the way back. */
  listTitle?: string;
  cta?: string;
  /** The site's contact section, drawn under a product that exists. */
  contact?: React.ReactNode;
}

interface Loaded { product: Product; related: Product[] }

const fromInline = (slug: string): Loaded | null => {
  const raw = readInlinePage('product') as { product?: unknown; related?: unknown[] } | null;
  const product = parseProduct(raw?.product);
  if (!product || product.slug !== slug) return null;
  return { product, related: (raw?.related ?? []).map(parseProduct).filter((p): p is Product => !!p) };
};

/**
 * LT-540: `/products/<slug>` (from Erel's product page): the pictures beside the
 * name, price, button and words, then who sells it and a few more of theirs.
 * The form stays on this page: the shell draws the contact section under it, and
 * the button brings the visitor there with the product chosen. His favourite
 * heart, the star rating and the shipping line stay out: no fact here is one the
 * owner did not give.
 */
const ProductPage: React.FC<Props> = ({ slug, businessName, logo, phone, currency, listTitle, cta, contact }) => {
  const { t, language } = useLanguage();
  const { go } = useSiteNav();
  const { setInquiry } = useProductInquiry();
  const [loaded, setLoaded] = useState<Loaded | null | 'missing'>(() => fromInline(slug));
  const [copied, setCopied] = useState(false);
  const Sep = language === 'he' || language === 'ar' ? ChevronLeft : ChevronRight;

  useEffect(() => {
    setInquiry(null);
    const inline = fromInline(slug);
    if (inline) { setLoaded(inline); return; }
    setLoaded(null);
    let stale = false;
    WebConfigService.getInstance().getProduct(window.location.hostname.split('.')[0], slug)
      .then((result) => { if (!stale) setLoaded(result ?? 'missing'); })
      .catch(() => { if (!stale) setLoaded('missing'); });
    return () => { stale = true; };
  }, [slug, setInquiry]);

  const product = loaded && loaded !== 'missing' ? loaded.product : null;

  useEffect(() => {
    if (!product) return;
    const before = document.title;
    document.title = `${product.name} | ${businessName}`;
    return () => { document.title = before; };
  }, [product, businessName]);

  if (loaded === 'missing') return <NotFound />;
  if (!loaded || !product) return <Loading isLoading={true} />;

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: product.name, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // the visitor closed the share sheet
    }
  };

  const crumb = 'hover:text-primary dark:hover:text-primary-dark transition-colors';
  return (<>
    <article className="bg-light-bg dark:bg-dark-bg pb-16" style={{ paddingTop: 'calc(var(--nav-offset, 0px) + 1.5rem)' }}>
      <div className="container mx-auto max-w-6xl px-4">
        <nav aria-label={t('products.breadcrumbs')} className="mb-5 flex flex-wrap items-center gap-1 text-sm text-light-text/70 dark:text-dark-text/70">
          <a href="/" onClick={(e) => followLink(e, '/', go)} className={crumb}>{t('nav.home')}</a>
          <Sep className="h-4 w-4" aria-hidden="true" />
          <a href={PRODUCTS_PATH} onClick={(e) => followLink(e, PRODUCTS_PATH, go)} className={crumb}>{listTitle?.trim() || t('products.title')}</a>
          <Sep className="h-4 w-4" aria-hidden="true" />
          <span aria-current="page" className="break-words text-light-text dark:text-dark-text">{product.name}</span>
        </nav>

        <div className={`grid gap-8 lg:gap-12 ${product.images.length ? 'lg:grid-cols-2' : ''}`}>
          <ProductPictures product={product} eager />
          <div className="flex flex-col text-light-text dark:text-dark-text">
            {product.category && <p className="mb-1 text-sm font-medium text-light-text/70 dark:text-dark-text/70 break-words">{product.category}</p>}
            <h1 className="text-3xl font-bold tracking-tight break-words md:text-4xl">{product.name}</h1>
            <Price product={product} currency={currency} className="mt-2 text-3xl font-bold" />
            <ProductActions product={product} phone={phone} label={cta} className="my-6" />
            {product.details.length > 0 && (
              <ul className="mb-6 flex flex-wrap gap-2">
                {product.details.map((detail) => (
                  <li key={detail} className="rounded-full bg-light-surface px-3 py-1.5 text-sm dark:bg-dark-surface break-words">{detail}</li>
                ))}
              </ul>
            )}
            {(product.description || product.summary) && (
              <p className="whitespace-pre-line leading-relaxed text-light-text/85 dark:text-dark-text/85 break-words">{product.description || product.summary}</p>
            )}
            <div className="mt-8 flex items-center justify-between gap-4 border-t border-light-text/15 pt-6 dark:border-dark-text/15">
              <a href="/" onClick={(e) => followLink(e, '/', go)} className="flex min-w-0 items-center gap-3">
                {logo && <img src={ImagesService.getInstance().getImage(logo)} alt="" onError={handleSquareImageError} className="h-12 w-12 shrink-0 rounded-full object-cover" />}
                <span className="min-w-0 font-semibold break-words">{businessName}</span>
              </a>
              <button type="button" onClick={share} className="inline-flex shrink-0 items-center gap-2 text-sm font-medium hover:text-primary dark:hover:text-primary-dark transition-colors">
                {copied ? <Check className="h-5 w-5" aria-hidden="true" /> : <Share2 className="h-5 w-5" aria-hidden="true" />}
                {copied ? t('products.copied') : t('products.share')}
              </button>
            </div>
          </div>
        </div>

        {loaded.related.length > 0 && (
          <section className="mt-16" aria-labelledby="related-products">
            <h2 id="related-products" className="mb-6 text-2xl font-bold text-light-text dark:text-dark-text">{t('products.related')}</h2>
            <WellTiles items={loaded.related.slice(0, 4)} pages currency={currency} />
          </section>
        )}
      </div>
    </article>
    {contact}
  </>);
};

export default ProductPage;

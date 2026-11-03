import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, Share2, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { PRODUCTS_PATH, parseProduct, type Product } from '../../models/Product';
import type { ProductCardStyle, ProductPageLayout } from '../../models/DesignConfig';
import WebConfigService from '../../services/WebConfigService';
import { countsHere, noteProductView } from '../../services/visits';
import { readInlinePage } from '../../services/edgeShell';
import { followLink, useSiteNav } from '../../services/siteNav';
import { productAction, useProductInquiry } from '../../services/productAction';
import ImagesService from '../../services/ImagesService';
import { handleSquareImageError } from '../../utils/imageFallback';
import NotFound from '../NotFound';
import Loading from '../Loading';
import { INQUIRE_HASH, Price, ProductActions, ProductPictures, SoldOut, altOfImage, imageUrl, toTheForm } from './ProductParts';
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
  /** LT-545: the page's layout, and the card of the products under it. */
  layout?: ProductPageLayout;
  card?: ProductCardStyle;
  /** LT-554: the wizard's sample products, in its preview: the page is drawn from them. */
  drafts?: Product[];
}

const LAYOUTS: ProductPageLayout[] = ['side', 'hero', 'gallery'];

/**
 * LT-545 'gallery': every picture at full width, one under the other beside the
 * words on a computer, swiped sideways on a phone.
 */
const GalleryPictures: React.FC<{ product: Product }> = ({ product }) => {
  const { t } = useLanguage();
  const [at, setAt] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const images = product.images;
  if (!images.length) return null;
  // Right to left the strip scrolls to negative offsets: the distance is what counts.
  const onScroll = () => {
    const el = strip.current;
    if (el && el.clientWidth) setAt(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  };
  return (
    <div className="min-w-0">
      <div
        ref={strip}
        onScroll={onScroll}
        role="group"
        aria-label={t('products.pictures')}
        tabIndex={0}
        className="-mx-4 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-4 lg:overflow-visible lg:snap-none"
      >
        {images.map((image, i) => (
          <div key={image.url} className="relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden bg-light-surface dark:bg-dark-surface lg:rounded-design-card">
            <img src={imageUrl(image)} alt={altOfImage(product, image)} loading={i === 0 ? 'eager' : 'lazy'} onError={handleSquareImageError} className="h-full w-full object-cover" />
            {i === 0 && product.soldOut && <SoldOut className="absolute top-3 start-3" />}
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
          {images.map((image, i) => (
            <span key={image.url} className={`h-2 w-2 rounded-full transition-colors ${i === at ? 'bg-primary dark:bg-primary-dark' : 'bg-light-text/25 dark:bg-dark-text/25'}`} />
          ))}
        </div>
      )}
    </div>
  );
};

interface Loaded { product: Product; related: Product[] }

const fromInline = (slug: string): Loaded | null => {
  const raw = readInlinePage('product') as { product?: unknown; related?: unknown[] } | null;
  const product = parseProduct(raw?.product);
  if (!product || product.slug !== slug) return null;
  return { product, related: (raw?.related ?? []).map(parseProduct).filter((p): p is Product => !!p) };
};

/** The server's choice of more products, made from the drafts: the same category first, four at most. */
const fromDrafts = (slug: string, drafts: Product[]): Loaded | null => {
  const product = drafts.find((p) => p.slug === slug);
  if (!product) return null;
  const others = drafts.filter((p) => p.slug !== slug);
  const same = others.filter((p) => !product.category || p.category === product.category);
  return { product, related: (same.length ? same : others).slice(0, 4) };
};

/**
 * LT-540: `/products/<slug>` (from Erel's product page): the pictures beside the
 * name, price, button and words, then who sells it and a few more of theirs.
 * The form stays on this page: the shell draws the contact section under it, and
 * the button brings the visitor there with the product chosen. His favourite
 * heart, the star rating and the shipping line stay out: no fact here is one the
 * owner did not give.
 */
const ProductPage: React.FC<Props> = ({ slug, businessName, logo, phone, currency, listTitle, cta, contact, layout, card, drafts }) => {
  const { t, language } = useLanguage();
  const { go } = useSiteNav();
  const { hash } = useLocation();
  const { setInquiry } = useProductInquiry();
  const [loaded, setLoaded] = useState<Loaded | null | 'missing'>(() => fromInline(slug) ?? (drafts ? fromDrafts(slug, drafts) ?? 'missing' : null));
  const [copied, setCopied] = useState(false);
  const Sep = language === 'he' || language === 'ar' ? ChevronLeft : ChevronRight;
  const shape: ProductPageLayout = LAYOUTS.includes(layout as ProductPageLayout) ? (layout as ProductPageLayout) : 'side';

  // Another product: nothing chosen in the form yet. Not when the same page is
  // drawn again (the wizard's pictures arriving), or the choice would be lost.
  useEffect(() => { setInquiry(null); }, [slug, setInquiry]);

  useEffect(() => {
    const inline = fromInline(slug);
    if (inline) { setLoaded(inline); return; }
    if (drafts) { setLoaded(fromDrafts(slug, drafts) ?? 'missing'); return; }
    setLoaded(null);
    let stale = false;
    WebConfigService.getInstance().getProduct(window.location.hostname.split('.')[0], slug)
      .then((result) => { if (!stale) setLoaded(result ?? 'missing'); })
      .catch(() => { if (!stale) setLoaded('missing'); });
    return () => { stale = true; };
  }, [slug, drafts]);

  const product = loaded && loaded !== 'missing' ? loaded.product : null;

  // LT-569: a view for the owner's most viewed - a real product of the live site, never a draft or a preview.
  useEffect(() => {
    if (product && !drafts && countsHere()) noteProductView(window.location.hostname.split('.')[0], product.id);
  }, [product, drafts]);

  useEffect(() => {
    if (!product) return;
    const before = document.title;
    document.title = `${product.name} | ${businessName}`;
    return () => { document.title = before; };
  }, [product, businessName]);

  // LT-545: a card's own button opens the page at its form, the product chosen.
  useEffect(() => {
    if (!product || hash !== INQUIRE_HASH) return;
    setInquiry({ id: product.id, name: product.name });
    let tries = 0;
    const id = window.setInterval(() => {
      const form = document.querySelector('#contact form');
      if (!form && ++tries < 20) return;
      window.clearInterval(id);
      if (form) toTheForm(); else window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }, 50);
    return () => window.clearInterval(id);
  }, [product, hash, setInquiry]);

  // LT-545 'gallery': on a phone the main button stays at hand while the page's
  // own is out of view, and steps aside for the form.
  const actionsRef = useRef<HTMLDivElement>(null);
  const [handy, setHandy] = useState(false);
  useEffect(() => {
    if (shape !== 'gallery' || !product || typeof IntersectionObserver === 'undefined') return;
    const actions = actionsRef.current;
    // The form itself, not its section: the section's heading comes into view long before it.
    const form = document.querySelector('#contact form') ?? document.getElementById('contact');
    let actionsSeen = true;
    let formSeen = false;
    const watch = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === actions) actionsSeen = entry.isIntersecting;
        else formSeen = entry.isIntersecting;
      }
      setHandy(!actionsSeen && !formSeen);
    });
    if (actions) watch.observe(actions);
    if (form) watch.observe(form);
    return () => { watch.disconnect(); setHandy(false); };
  }, [shape, product]);

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
  const hero = shape === 'hero';
  const crumbs = (
    <nav aria-label={t('products.breadcrumbs')} className="mb-5 flex flex-wrap items-center gap-1 text-sm text-light-text/70 dark:text-dark-text/70">
      <a href="/" onClick={(e) => followLink(e, '/', go)} className={crumb}>{t('nav.home')}</a>
      <Sep className="h-4 w-4" aria-hidden="true" />
      <a href={PRODUCTS_PATH} onClick={(e) => followLink(e, PRODUCTS_PATH, go)} className={crumb}>{listTitle?.trim() || t('products.title')}</a>
      <Sep className="h-4 w-4" aria-hidden="true" />
      <span aria-current="page" className="break-words text-light-text dark:text-dark-text">{product.name}</span>
    </nav>
  );
  // The words, the price and the button: beside the pictures, or under one large one (centred).
  const words = (
    <div className={`flex flex-col text-light-text dark:text-dark-text ${hero ? 'mx-auto mt-8 w-full max-w-3xl' : ''}`}>
      <div className={hero ? 'text-center' : ''}>
        {product.category && <p className="mb-1 text-sm font-medium text-light-text/70 dark:text-dark-text/70 break-words">{product.category}</p>}
        <h1 className={`font-bold tracking-tight break-words ${hero ? 'text-4xl md:text-5xl' : 'text-3xl md:text-4xl'}`}>{product.name}</h1>
        <Price product={product} currency={currency} className="mt-2 text-3xl font-bold" />
        <div ref={actionsRef}>
          <ProductActions product={product} phone={phone} label={cta} className={`my-6 ${hero ? 'justify-center' : ''}`} />
        </div>
        {product.details.length > 0 && (
          <ul className={`mb-6 flex flex-wrap gap-2 ${hero ? 'justify-center' : ''}`}>
            {product.details.map((detail) => (
              <li key={detail} className="rounded-full bg-light-surface px-3 py-1.5 text-sm dark:bg-dark-surface break-words">{detail}</li>
            ))}
          </ul>
        )}
      </div>
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
  );
  const inquire = (e: React.MouseEvent) => {
    e.preventDefault();
    setInquiry({ id: product.id, name: product.name });
    toTheForm();
  };

  return (<>
    <article className="bg-light-bg dark:bg-dark-bg pb-16" style={{ paddingTop: 'calc(var(--nav-offset, 0px) + 1.5rem)' }}>
      <div className="container mx-auto max-w-6xl px-4">
        {crumbs}

        {shape === 'gallery' ? (
          <div className={`grid gap-8 lg:gap-12 ${product.images.length ? 'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]' : ''}`}>
            <GalleryPictures product={product} />
            {/* The words stay in view while the pictures go by (a computer). */}
            <div className="lg:sticky lg:top-[calc(var(--nav-offset,0px)_+_1.5rem)] lg:self-start">{words}</div>
          </div>
        ) : hero ? (<>
          <ProductPictures
            product={product}
            eager
            // Wide and no taller than most of the screen: the name stays near the fold.
            frameClassName="-mx-4 aspect-[4/5] sm:mx-0 sm:aspect-[16/9] sm:max-h-[65vh] sm:rounded-design-card"
            thumbsClassName="justify-center"
          />
          {words}
        </>) : (
          <div className={`grid gap-8 lg:gap-12 ${product.images.length ? 'lg:grid-cols-2' : ''}`}>
            <ProductPictures product={product} eager />
            {words}
          </div>
        )}

        {loaded.related.length > 0 && (
          <section className="mt-16" aria-labelledby="related-products">
            <h2 id="related-products" className="mb-6 text-2xl font-bold text-light-text dark:text-dark-text">{t('products.related')}</h2>
            <WellTiles items={loaded.related.slice(0, 4)} pages currency={currency} card={card} cta={cta} />
          </section>
        )}
      </div>
    </article>
    {contact}
    {shape === 'gallery' && productAction(product) === 'inquire' && (
      // Between the corner buttons (accessibility, Lighty), above the phone's own bar.
      <div
        aria-hidden={!handy}
        data-testid="product-handy"
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-20 pb-[calc(env(safe-area-inset-bottom)_+_1rem)] transition-[opacity,transform] duration-200 lg:hidden ${handy ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
      >
        <a
          href="#contact"
          tabIndex={handy ? 0 : -1}
          onClick={inquire}
          className={`inline-flex max-w-full items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-on-primary shadow-lg dark:bg-primary-dark dark:text-on-primary-dark ${handy ? 'pointer-events-auto' : ''}`}
        >
          <ShoppingBag className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="break-words">{cta?.trim() || t('products.cta')}</span>
          <Price product={product} currency={currency} className="opacity-90" />
        </a>
      </div>
    )}
  </>);
};

export default ProductPage;

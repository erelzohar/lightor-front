import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Check, LayoutGrid, Share2, ShoppingBag, Tag } from 'lucide-react';
import { useStill } from '../../hooks/useA11yPrefs';
import { useLanguage } from '../../contexts/LanguageContext';
import { PRODUCTS_PATH, parseProduct, type Product } from '../../models/Product';
import type { ProductCardStyle, ProductPageLayout } from '../../models/DesignConfig';
import WebConfigService from '../../services/WebConfigService';
import { countsHere, noteProductView } from '../../services/visits';
import { readInlinePage } from '../../services/edgeShell';
import { followLink, useSiteNav } from '../../services/siteNav';
import { productAction, takeChoice, useProductInquiry, type ProductChoice } from '../../services/productAction';
import ImagesService from '../../services/ImagesService';
import { handleSquareImageError } from '../../utils/imageFallback';
import NotFound from '../NotFound';
import Loading from '../Loading';
import { INQUIRE_HASH, Price, ProductActions, ProductOptions, ProductPictures, SoldOut, altOfImage, imageUrl, toTheForm } from './ProductParts';
import { WellTiles } from './ProductTiles';
import { part } from '../../designs/parts';
import { cardOf } from '../../services/productCards';

// LT-605: gallery's product on its ledge, electric's floating stage.
const ProductStand = part('productStand', (m) => m.default);
const ProductStage = part('productStage', (m) => m.default);

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

const LAYOUTS: ProductPageLayout[] = ['side', 'hero', 'gallery', 'detail', 'stand', 'stage'];

/** LT-588: the products page at one category (its section, or its filter in the shop). */
export const categoryPath = (category: string): string => `${PRODUCTS_PATH}?category=${encodeURIComponent(category)}`;

/**
 * LT-588 'detail' (Erel's product detail page): one picture at a time, rising
 * in as it changes, dots under it to move between them and, beside the dots,
 * the way to more of its category.
 */
const DetailPictures: React.FC<{ product: Product }> = ({ product }) => {
  const { t } = useLanguage();
  const { go } = useSiteNav();
  const still = useStill();
  const [at, setAt] = useState(0);
  const images = product.images;
  const image = images[Math.min(at, images.length - 1)];
  if (!image) return null;
  return (
    <div className="flex flex-col gap-4">
      <motion.div
        key={image.url}
        initial={still ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-light-text/10 bg-light-surface dark:border-dark-text/10 dark:bg-dark-surface"
      >
        <img src={imageUrl(image)} alt={altOfImage(product, image)} loading="eager" onError={handleSquareImageError} className="h-full w-full object-cover" />
        {product.soldOut && <SoldOut className="absolute top-3 start-3" />}
      </motion.div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {images.length > 1 ? (
          <div className="flex gap-1" role="group" aria-label={t('products.pictures')}>
            {images.map((img, i) => (
              <button key={img.url} type="button" onClick={() => setAt(i)} aria-label={t('products.picture', { index: i + 1 })} aria-current={i === at || undefined} className="flex h-6 w-6 items-center justify-center">
                <span className={`block h-2 w-2 rounded-full transition-colors ${i === at ? 'bg-primary dark:bg-primary-dark' : 'bg-light-text/30 hover:bg-light-text/50 dark:bg-dark-text/30'}`} />
              </button>
            ))}
          </div>
        ) : <span />}
        {product.category && (
          <a href={categoryPath(product.category)} onClick={(e) => followLink(e, categoryPath(product.category!), go)} className="inline-flex items-center gap-2 rounded-design border border-light-text/20 px-3 py-1.5 text-sm font-medium text-light-text hover:border-primary dark:border-dark-text/20 dark:text-dark-text dark:hover:border-primary-dark transition-colors">
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            <span className="break-words">{t('products.moreOf', { category: product.category })}</span>
          </a>
        )}
      </div>
    </div>
  );
};

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

/** `partial`: drawn from the product's card while the rest is on its way (LT-605). */
interface Loaded { product: Product; related: Product[]; partial?: boolean }

const fromInline = (slug: string): Loaded | null => {
  const raw = readInlinePage('product') as { product?: unknown; related?: unknown[] } | null;
  const product = parseProduct(raw?.product);
  if (!product || product.slug !== slug) return null;
  return { product, related: (raw?.related ?? []).map(parseProduct).filter((p): p is Product => !!p) };
};

/** LT-605: the card the visitor just tapped (the wall's move needs the page at once); the rest follows. */
const fromCard = (slug: string): Loaded | null => {
  const card = cardOf(slug);
  return card ? { product: { ...card, details: [] }, related: [], partial: true } : null;
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
  const [loaded, setLoaded] = useState<Loaded | null | 'missing'>(() => fromInline(slug) ?? (drafts ? fromDrafts(slug, drafts) ?? 'missing' : fromCard(slug)));
  const [copied, setCopied] = useState(false);
  // LT-588: the colour and size the visitor picks here (or brought from the card).
  const [choice, setChoice] = useState<ProductChoice>({});
  const rtl = language === 'he' || language === 'ar';
  const Sep = rtl ? ChevronLeft : ChevronRight;
  const shape: ProductPageLayout = LAYOUTS.includes(layout as ProductPageLayout) ? (layout as ProductPageLayout) : 'side';

  // Another product: nothing chosen in the form yet. Not when the same page is
  // drawn again (the wizard's pictures arriving), or the choice would be lost.
  useEffect(() => { setInquiry(null); setChoice({}); }, [slug, setInquiry]);

  useEffect(() => {
    const inline = fromInline(slug);
    if (inline) { setLoaded(inline); return; }
    if (drafts) { setLoaded(fromDrafts(slug, drafts) ?? 'missing'); return; }
    const card = fromCard(slug);
    setLoaded(card);
    let stale = false;
    WebConfigService.getInstance().getProduct(window.location.hostname.split('.')[0], slug)
      .then((result) => { if (!stale) setLoaded(result ?? (card ?? 'missing')); })
      .catch(() => { if (!stale) setLoaded(card ?? 'missing'); });
    return () => { stale = true; };
  }, [slug, drafts]);

  const product = loaded && loaded !== 'missing' ? loaded.product : null;
  const partial = !!(loaded && loaded !== 'missing' && loaded.partial);

  // LT-569: a view for the owner's most viewed - a real product of the live site, never a draft or a preview.
  useEffect(() => {
    if (product && !partial && !drafts && countsHere()) noteProductView(window.location.hostname.split('.')[0], product.id);
  }, [product, partial, drafts]);

  useEffect(() => {
    if (!product) return;
    const before = document.title;
    document.title = `${product.name} | ${businessName}`;
    return () => { document.title = before; };
  }, [product, businessName]);

  // LT-545: a card's own button opens the page at its form, the product chosen.
  useEffect(() => {
    if (!product || hash !== INQUIRE_HASH) return;
    // LT-588: the pick made on the card that led here.
    const picked = takeChoice(product.id);
    if (picked) setChoice(picked);
    setInquiry({ id: product.id, name: product.name, ...(picked ? { choice: picked } : {}) });
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
        <ProductOptions product={product} choice={choice} onChange={setChoice} className={`mt-6 ${hero ? 'flex flex-col items-center' : ''}`} />
        <div ref={actionsRef}>
          <ProductActions product={product} phone={phone} label={cta} choice={choice} className={`my-6 ${hero ? 'justify-center' : ''}`} />
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
        {shape === 'stand' ? null : shape === 'detail' ? (
          <div className="flex items-start justify-between gap-3">
            {crumbs}
            <button type="button" onClick={share} aria-label={copied ? t('products.copied') : t('products.share')} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-light-text hover:bg-light-text/10 dark:text-dark-text dark:hover:bg-dark-text/10 transition-colors">
              {copied ? <Check className="h-5 w-5" aria-hidden="true" /> : <Share2 className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        ) : crumbs}

        {shape === 'stand' || shape === 'stage' ? (
          (() => {
            const look = { product, currency, phone, cta, choice, onChoice: setChoice, businessName, logo, listTitle, share, copied, actionsRef };
            return shape === 'stand' ? <ProductStand {...look} /> : <ProductStage {...look} />;
          })()
        ) : shape === 'detail' ? (
          <div className="grid grid-cols-1 gap-8 md:gap-12 lg:grid-cols-2">
            <DetailPictures product={product} />
            <div className="flex flex-col text-light-text dark:text-dark-text">
              <h1 className="text-3xl font-bold tracking-tight break-words md:text-4xl">{product.name}</h1>
              <Price product={product} currency={currency} className="mt-2 text-4xl font-bold" />
              <ProductOptions product={product} choice={choice} onChange={setChoice} className="mt-6" />
              <div ref={actionsRef}>
                <ProductActions product={product} phone={phone} label={cta} choice={choice} className="my-6 [&>a]:flex-1" />
              </div>
              {(product.category || product.details.length > 0) && (
                <ul className="mb-6 flex flex-wrap gap-2">
                  {[...(product.category ? [product.category] : []), ...product.details].map((tag) => (
                    <li key={tag} className="inline-flex items-center gap-2 rounded-full bg-light-text/[0.07] px-3 py-1 text-sm dark:bg-dark-text/10 break-words">
                      <Tag className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
              {(product.description || product.summary) && (
                <p className="whitespace-pre-line leading-relaxed text-light-text/75 dark:text-dark-text/75 break-words">{product.description || product.summary}</p>
              )}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-light-text/15 pt-6 dark:border-dark-text/15">
                <a href="/" onClick={(e) => followLink(e, '/', go)} className="flex min-w-0 items-center gap-4">
                  {logo
                    ? <img src={ImagesService.getInstance().getImage(logo)} alt="" onError={handleSquareImageError} className="h-12 w-12 shrink-0 rounded-full object-cover" />
                    : <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-light-text/10 font-semibold dark:bg-dark-text/15">{businessName.charAt(0)}</span>}
                  <span className="min-w-0 font-semibold break-words">{businessName}</span>
                </a>
                <a href={PRODUCTS_PATH} onClick={(e) => followLink(e, PRODUCTS_PATH, go)} className="inline-flex items-center gap-1.5 font-medium text-primary-readable hover:underline dark:text-primary-dark-readable">
                  {t('products.allListings')}
                  {rtl ? <ArrowLeft className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                </a>
              </div>
            </div>
          </div>
        ) : shape === 'gallery' ? (
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

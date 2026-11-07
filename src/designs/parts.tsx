import { createElement, useSyncExternalStore, type ComponentType } from 'react';
import type { WebsiteConfig } from '../models/WebsiteConfig';
import { sitePageOf } from '../services/sitePages';
import { takesBookings } from '../services/siteMode';
import { blogLooksOf, blogSectionLayoutOf, withBlogBlock } from '../services/blogLooks';

/**
 * LT-603: the designs a site can draw, each in its own file ("part"), so a
 * site downloads only the ones its config uses. Before this every site's main
 * script carried every design (1 MB), and each new design made every site
 * slower; now a new design adds nothing to the sites that do not use it.
 *
 * A NEW DESIGN GOES IN ITS OWN FILE AND IS LISTED HERE, then reached through
 * `part()` (or `optionalPart()`), never imported straight into a section.
 * `partsFor()` names the parts a config draws; the page waits for them before
 * it shows (App), so nothing pops in, and the editor's and the wizard's
 * previews keep the last page on screen until a newly chosen design arrives.
 * A part a config needs that `partsFor()` forgot still works: its section
 * waits for it on its own (a Suspense boundary), it just shows a moment later.
 */
export const PARTS = {
  // The products section, its moving layouts and its pages (LT-540, LT-545, LT-588).
  products: () => import('../components/products/Products'),
  productBelt: () => import('../components/products/ProductBelt'),
  productRail: () => import('../components/products/ProductRail'),
  productCoverflow: () => import('../components/products/ProductCoverflow'),
  productOrbit: () => import('../components/products/ProductOrbit'),
  productShelves: () => import('../components/products/ProductShelves'),
  productFeature: () => import('../components/products/ProductFeature'),
  // LT-605: the wall of shelves, and the product pages it and electric lead to.
  productWall: () => import('../components/products/ProductWall'),
  productStand: () => import('../components/products/ProductStand'),
  productStage: () => import('../components/products/ProductStage'),
  productsPage: () => import('../components/products/ProductsPage'),
  productPage: () => import('../components/products/ProductPage'),
  // LT-610: the blog - its page and each look of its list, a post's page, and
  // the home page's section with its two moving looks (Erel's pastes).
  blogPage: () => import('../components/blog/BlogPage'),
  blogGrid: () => import('../components/blog/BlogGrid'),
  blogTagged: () => import('../components/blog/BlogTagged'),
  blogGlass: () => import('../components/blog/BlogGlass'),
  postPage: () => import('../components/blog/PostPage'),
  blogSection: () => import('../components/blog/BlogSection'),
  blogArticles: () => import('../components/blog/BlogArticles'),
  blogCarousel: () => import('../components/blog/BlogCarousel'),
  // The gallery and its moving layouts (LT-525).
  gallery: () => import('../components/Portfolio'),
  galleryClothesline: () => import('../components/gallery/Clothesline'),
  galleryCurve: () => import('../components/gallery/CurveReel'),
  galleryCascade: () => import('../components/gallery/TiltCascade'),
  // The heroes in their own files (LT-531) and the sonar field behind one.
  heroParallax: () => import('../components/Layout/heroes/ParallaxHero'),
  heroExpand: () => import('../components/Layout/heroes/ExpandHero'),
  heroAero: () => import('../components/Layout/heroes/AeroHero'),
  heroSlant: () => import('../components/Layout/heroes/SlantHero'),
  heroCollage: () => import('../components/Layout/heroes/CollageHero'),
  heroMesh: () => import('../components/Layout/heroes/MeshHero'),
  heroSonar: () => import('../components/Layout/heroes/SonarField'),
  // LT-605: festive's raised button with the splash (the hero's main button).
  splashButton: () => import('../components/ui/SplashButton'),
  // Sections only some sites have.
  schedule: () => import('../components/Layout/Schedule/Schedule'),
  ledger: () => import('../components/Layout/ServicesLedger'),
  bookingBand: () => import('../components/Layout/BookingBand'),
  interlude: () => import('../components/Layout/Interlude'),
  featureStack: () => import('../components/Layout/FeatureStack'),
  editorialQuotes: () => import('../components/Layout/EditorialQuotes'),
  // The composer's blocks (LT-136).
  ticker: () => import('../components/blocks/TickerBlock'),
  announcement: () => import('../components/blocks/Announcement'),
  manifesto: () => import('../components/blocks/Manifesto'),
  stats: () => import('../components/blocks/Stats'),
  pullQuote: () => import('../components/blocks/PullQuote'),
  process: () => import('../components/blocks/Process'),
  priceCards: () => import('../components/blocks/PriceCards'),
  hours: () => import('../components/blocks/Hours'),
  photoPair: () => import('../components/blocks/PhotoPair'),
  beforeAfter: () => import('../components/blocks/BeforeAfter'),
  mapStrip: () => import('../components/blocks/MapStrip'),
  logoMark: () => import('../components/blocks/LogoMark'),
  social: () => import('../components/blocks/SocialTiles'),
  // Pages and windows a visitor reaches by a link or a tap.
  manage: () => import('../components/ManageAppointment'),
  contactModal: () => import('../components/ContactModalView'),
} as const;

export type PartKey = keyof typeof PARTS;
type ModuleOf<K extends PartKey> = Awaited<ReturnType<(typeof PARTS)[K]>>;

const modules = new Map<PartKey, unknown>();
const pending = new Map<PartKey, Promise<unknown>>();
const listeners = new Set<() => void>();
let version = 0;
let suspended = 0;

const notify = () => {
  version += 1;
  listeners.forEach((fn) => fn());
};

// A part that cannot arrive is almost always a deploy that replaced the
// build's files under a page opened before it (or a broken connection): load
// the page again, once per ten minutes, so it asks for the new names.
const RELOAD_KEY = 'lightor.partReload';
const recoverFromMissingPart = (err: unknown) => {
  console.warn('[lightor] a design part failed to load', err);
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 10 * 60_000) return;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return; // no storage: no way to tell a loop from a first try
  }
  window.location.reload();
};

/** Starts loading one part (once); resolves when it is ready. */
export const loadPart = (key: PartKey): Promise<unknown> => {
  if (modules.has(key)) return Promise.resolve(modules.get(key));
  let p = pending.get(key);
  if (!p) {
    p = PARTS[key]().then(
      (mod) => {
        modules.set(key, mod);
        pending.delete(key);
        notify();
        return mod;
      },
      (err: unknown) => {
        pending.delete(key);
        recoverFromMissingPart(err);
        throw err;
      },
    );
    pending.set(key, p);
  }
  return p;
};

export const partLoaded = (key: PartKey): boolean => modules.has(key);

/** Loads every part named; never rejects (a failed part shows nothing, see above). */
export const preloadParts = (keys: Iterable<PartKey>): Promise<void> =>
  Promise.all([...new Set(keys)].map((k) => loadPart(k).catch(() => undefined))).then(() => undefined);

/** Every part (tests, so components render at once as before LT-603). */
export const preloadAllParts = (): Promise<void> => preloadParts(Object.keys(PARTS) as PartKey[]);

/** How many times a part made its section wait (a test reads it to prove `partsFor` named all). */
export const partWaits = (): number => suspended;

/** Tests only: forget what is loaded. */
export const resetPartsForTest = (): void => {
  modules.clear();
  pending.clear();
  suspended = 0;
  notify();
};

/**
 * A component from a part, drawn at once when the part is loaded; otherwise
 * its section waits (Suspense) while it arrives.
 */
export function part<K extends PartKey, P extends object>(key: K, pick: (mod: ModuleOf<K>) => ComponentType<P>): ComponentType<P> {
  const Part = (props: P) => {
    const mod = modules.get(key) as ModuleOf<K> | undefined;
    if (mod) return createElement(pick(mod), props);
    suspended += 1;
    throw loadPart(key);
  };
  Part.displayName = `Part(${key})`;
  return Part;
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

/**
 * A component from a part that nothing has to wait for (a window opened by a
 * tap): nothing is drawn until it is loaded, and loading starts the first
 * time it is drawn wanted.
 */
export function optionalPart<K extends PartKey, P extends object>(
  key: K,
  pick: (mod: ModuleOf<K>) => ComponentType<P>,
  /** Load only once this holds (a window: when it opens); always by default. */
  wanted: (props: P) => boolean = () => true,
): ComponentType<P> {
  const Part = (props: P) => {
    useSyncExternalStore(subscribe, () => version, () => version);
    const mod = modules.get(key) as ModuleOf<K> | undefined;
    if (!mod) {
      if (wanted(props)) void loadPart(key).catch(() => undefined);
      return null;
    }
    return createElement(pick(mod), props);
  };
  Part.displayName = `OptionalPart(${key})`;
  return Part;
}

// The values a design names, and the part that draws each (the rest are drawn
// by their section's own file).
const HERO_PARTS: Record<string, PartKey> = { parallax: 'heroParallax', expand: 'heroExpand', aero: 'heroAero', slant: 'heroSlant', collage: 'heroCollage', mesh: 'heroMesh' };
const GALLERY_PARTS: Record<string, PartKey> = { clothesline: 'galleryClothesline', curve: 'galleryCurve', cascade: 'galleryCascade' };
const PRODUCT_PARTS: Record<string, PartKey> = { belt: 'productBelt', hanger: 'productRail', coverflow: 'productCoverflow', orbit: 'productOrbit', drops: 'productShelves', wall: 'productWall' };
const PAGE_PARTS: Record<string, PartKey> = { rows: 'productShelves', shelves: 'productShelves', wall: 'productWall' };
const PRODUCT_PAGE_PARTS: Record<string, PartKey> = { stand: 'productStand', stage: 'productStage' };
const BLOG_PAGE_PARTS: Record<string, PartKey> = { grid: 'blogGrid', tagged: 'blogTagged', glass: 'blogGlass' };
const BLOG_SECTION_PARTS: Record<string, PartKey> = { article: 'blogArticles', carousel: 'blogCarousel' };
const BLOCK_PARTS: Record<string, PartKey> = {
  ticker: 'ticker', announcement: 'announcement', manifesto: 'manifesto', stats: 'stats', pullQuote: 'pullQuote',
  process: 'process', priceCards: 'priceCards', hours: 'hours', photoPair: 'photoPair', beforeAfter: 'beforeAfter',
  mapStrip: 'mapStrip', logoMark: 'logoMark', social: 'social', ledger: 'ledger', bookingBand: 'bookingBand', interlude: 'interlude',
};

export interface SiteParts {
  /** Drawn by the first page shown: the page waits for these. */
  now: PartKey[];
  /** Likely next (the products' pages, the contact window): loaded after the page shows. */
  soon: PartKey[];
}

/**
 * The parts a config draws on `pathname`. Generous by design: a part named
 * here and not drawn costs a few kilobytes; one drawn and not named shows a
 * moment late.
 */
export const partsFor = (config: WebsiteConfig | null | undefined, pathname = '/'): SiteParts => {
  const now = new Set<PartKey>();
  const soon = new Set<PartKey>(['contactModal']);
  const path = pathname.replace(/\/+$/, '') || '/';
  if (/^\/manage\//.test(path) || /^\/m\//.test(path)) {
    now.add('manage');
    now.add('schedule');
  }
  if (!config) return { now: [...now], soon: [...soon] };

  const design = (config.design ?? {}) as unknown as Record<string, string | undefined>;
  // LT-610: a page with a blog draws its section even when its blocks predate it.
  const blocks = Array.isArray(config.blocks) && config.blocks.length ? withBlogBlock(config.blocks, !!config.blog) : null;
  const shown = (blocks ?? []).filter((b) => !b.mod?.hidden);
  const variantsOf = (type: string, token?: string): Set<string> => {
    const out = new Set<string>();
    if (token) out.add(token);
    for (const b of shown) if (b.type === type && b.variant) out.add(String(b.variant));
    return out;
  };
  const has = (type: string): boolean => (blocks ? shown.some((b) => b.type === type) : true);

  // Heroes, and the sonar field one can carry.
  for (const v of variantsOf('hero', design.heroLayout)) if (HERO_PARTS[v]) now.add(HERO_PARTS[v]);
  if (design.decor === 'sonar') now.add('heroSonar');
  if (design.buttonStyle === 'splash') now.add('splashButton');

  // The gallery (a products site has none unless it holds pictures).
  const pictures = (config.components?.portfolio?.items?.length ?? 0) > 0;
  if (config.components?.portfolio && (blocks ? has('gallery') : pictures || !config.products?.total)) {
    now.add('gallery');
    for (const v of variantsOf('gallery', design.portfolioLayout)) if (GALLERY_PARTS[v]) now.add(GALLERY_PARTS[v]);
  }

  // Products: the section, its layout, the single product drawn in full.
  const total = config.products?.total ?? config.products?.items?.length ?? 0;
  if (total > 0 && (blocks ? has('products') : true)) {
    now.add('products');
    if (total === 1) now.add('productFeature');
    for (const v of variantsOf('products', design.productsLayout)) if (PRODUCT_PARTS[v]) now.add(PRODUCT_PARTS[v]);
  }
  // A product's card and the "all products" button lead to these pages
  // whenever the products have pages (LT-539).
  if (config.products?.pages) {
    const page = sitePageOf(path).kind;
    // The shop (LT-588) comes with the products' page itself.
    const pages: PartKey[] = ['productsPage', 'productPage', 'products'];
    // Absent, the products page follows the home section's look (LT-545), as App draws it.
    const homeLook = blocks?.find((b) => b.type === 'products')?.variant;
    const pageLayout = design.productsPageLayout ?? (homeLook ? String(homeLook) : undefined) ?? design.productsLayout;
    if (pageLayout && PAGE_PARTS[pageLayout]) pages.push(PAGE_PARTS[pageLayout]);
    const productPage = design.productPageLayout;
    if (productPage && PRODUCT_PAGE_PARTS[productPage]) pages.push(PRODUCT_PAGE_PARTS[productPage]);
    for (const k of pages) (page === 'products' || page === 'product' ? now : soon).add(k);
  }

  // LT-610: the blog's section on the home page, its page and a post's; a carousel
  // of fewer than three posts is drawn as articles, so both are named.
  if (config.blog) {
    const looks = blogLooksOf(config.design);
    if (blocks ? has('blog') : true) {
      now.add('blogSection');
      const variants: (string | undefined)[] = blocks ? shown.filter((x) => x.type === 'blog').map((x) => x.variant) : [undefined];
      for (const variant of variants) {
        const look = blogSectionLayoutOf(variant, config.design);
        if (BLOG_SECTION_PARTS[look]) now.add(BLOG_SECTION_PARTS[look]);
        if (look === 'carousel') now.add('blogArticles');
      }
    }
    const page = sitePageOf(path).kind;
    const pages: PartKey[] = ['blogPage', BLOG_PAGE_PARTS[looks.page], 'postPage'];
    for (const k of pages) (page === 'blog' || page === 'post' ? now : soon).add(k);
  }

  // Features as a stack of pictures (LT-588), quotes as an editorial spread.
  if (design.aboutLayout === 'stack' || shown.some((b) => b.type === 'features' && b.variant === 'stack')) now.add('featureStack');
  if (variantsOf('quote', design.testimonialsLayout).has('editorial')) now.add('editorialQuotes');

  // The booking flow, on a site that takes bookings.
  if (takesBookings(config.conversion, config.appointmentTypes) && (blocks ? has('schedule') : !!config.components?.schedule)) now.add('schedule');

  if (blocks) {
    for (const b of shown) if (BLOCK_PARTS[b.type]) now.add(BLOCK_PARTS[b.type]);
  } else {
    // A legacy page (no blocks) draws these from its design tokens.
    if (design.servicesLayout && design.servicesLayout !== 'none') now.add('ledger');
    if (design.bookingBand && design.bookingBand !== 'none') now.add('bookingBand');
    now.add('interlude');
  }

  for (const k of now) soon.delete(k);
  return { now: [...now], soon: [...soon] };
};

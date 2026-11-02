/**
 * LT-539: the addresses a site answers on. The home page stays one long page;
 * only collections get addresses of their own. Anything else is not a page.
 * The edge keeps its own copy of this list for what crawlers are told
 * (lightor-edge src/pages.ts).
 */
export type SitePage =
  | { kind: 'home' }
  | { kind: 'products' }
  | { kind: 'product'; slug: string }
  | { kind: 'missing' };

export const sitePageOf = (pathname: string): SitePage => {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return { kind: 'home' };
  if (path === '/products') return { kind: 'products' };
  const product = /^\/products\/([^/]+)$/.exec(path);
  return product ? { kind: 'product', slug: product[1] } : { kind: 'missing' };
};

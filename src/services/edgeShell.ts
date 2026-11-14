/**
 * The edge shell (LT-194). A Cloudflare Worker in front of every tenant site
 * rewrites the HTML it serves: per-tenant title, description and social
 * tags, a static body for crawlers, and the site's public config inlined as
 * `<script id="lightor-config" type="application/json">`. When that script
 * is present the app paints from it at once instead of waiting for its
 * first API round trip, then asks the API in the background in case the
 * shell's copy (cached at the edge for a minute) is behind.
 *
 * Absent or unusable, nothing changes: the app fetches as it always did.
 */
import { isLightorHost, plainHost } from './siteHost';

export const INLINE_CONFIG_ID = 'lightor-config';

export interface InlineConfig {
  subDomain: string;
  /** LT-661: the host the edge served this page on; what names the site on a business's own domain. */
  host?: string;
  /** When the edge fetched it (ISO); informational. */
  fetchedAt: string;
  /** The API's `data` object, verbatim. */
  config: Record<string, unknown>;
}

/**
 * The inlined config, but only when it is for this very host: a shell copied
 * onto another hostname (a mirror, a proxy, a cached page served for the
 * wrong tenant) must never paint someone else's business.
 *
 * On `<name>.lightor.app` the host's first label is the site's name. On a
 * business's own domain (LT-661) the name says nothing, so the edge writes
 * the host it served the page on beside the config, and that must be this
 * host.
 */
export const readInlineConfig = (doc: Document, hostname: string): InlineConfig | null => {
  const element = doc.getElementById(INLINE_CONFIG_ID);
  if (!element || element.getAttribute('type') !== 'application/json') return null;
  const raw = element.textContent;
  if (!raw || !raw.trim()) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const { subDomain, host, fetchedAt, config } = parsed as Record<string, unknown>;
  if (typeof subDomain !== 'string' || !subDomain) return null;
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null;
  if (isLightorHost(hostname)) {
    if (hostname.split('.')[0] !== subDomain) return null;
  } else if (typeof host !== 'string' || !host || plainHost(host) !== plainHost(hostname)) {
    return null;
  }

  return {
    subDomain,
    ...(typeof host === 'string' && host ? { host } : {}),
    fetchedAt: typeof fetchedAt === 'string' ? fetchedAt : '',
    config: config as Record<string, unknown>,
  };
};

/** LT-540: the page's own data, inlined by the edge beside the config. */
export const INLINE_PAGE_ID = 'lightor-page';

/** The inlined data of this kind of page, once: a later page in the same visit reads the API. */
export const readInlinePage = (kind: 'products' | 'product' | 'blog' | 'post'): unknown => {
  const element = document.getElementById(INLINE_PAGE_ID);
  if (!element?.textContent) return null;
  try {
    const parsed = JSON.parse(element.textContent) as { kind?: string; data?: unknown };
    return parsed.kind === kind ? parsed.data : null;
  } catch {
    return null;
  }
};

/** Two parsed configs render the same page when their JSON is the same. */
export const sameConfig = (a: unknown, b: unknown): boolean => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

/**
 * The language to switch to once the API's copy replaces the shell's
 * (LT-209): the fresh default, when the owner changed it after the edge
 * cached its copy — but only while the page still shows the shell's
 * default. A language the visitor picked in the meantime is theirs. Null
 * leaves the language as it is.
 */
export const languageAfterRefresh = (
  shellDefault: string | undefined,
  freshDefault: string | undefined,
  current: string
): string | null =>
  freshDefault && freshDefault !== shellDefault && current === shellDefault ? freshDefault : null;

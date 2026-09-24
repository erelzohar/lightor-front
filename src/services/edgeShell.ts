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
export const INLINE_CONFIG_ID = 'lightor-config';

export interface InlineConfig {
  subDomain: string;
  /** When the edge fetched it (ISO); informational. */
  fetchedAt: string;
  /** The API's `data` object, verbatim. */
  config: Record<string, unknown>;
}

/**
 * The inlined config, but only when it is for this very host: a shell copied
 * onto another hostname (a mirror, a proxy, a cached page served for the
 * wrong tenant) must never paint someone else's business.
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

  const { subDomain, fetchedAt, config } = parsed as Record<string, unknown>;
  if (typeof subDomain !== 'string' || !subDomain) return null;
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null;
  if (hostname.split('.')[0] !== subDomain) return null;

  return {
    subDomain,
    fetchedAt: typeof fetchedAt === 'string' ? fetchedAt : '',
    config: config as Record<string, unknown>,
  };
};

/** Two parsed configs render the same page when their JSON is the same. */
export const sameConfig = (a: unknown, b: unknown): boolean => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

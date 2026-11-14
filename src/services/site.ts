import axios from 'axios';
import { readInlineConfig } from './edgeShell';
import { isLightorHost, plainHost } from './siteHost';

/**
 * LT-661: which site this page is, and where its API is.
 *
 * A site has always lived at `<name>.lightor.app`, and a dozen places read
 * the name off the host's first label. On a business's own domain
 * (`www.dana-studio.co.il`) that label says nothing, and the API is another
 * site there: its visitor-pass cookie would be a third-party one, which
 * Safari drops. So:
 *
 * - On a Lightor host nothing changes: the first label, the API's own address.
 * - On an outside host the name comes from the config the edge inlined (it
 *   carries the host it was served on), or, when the edge passed the page
 *   through bare, from the API's "which site is this host" route, asked once.
 *   Every API call goes to the page's own origin (`/api/...`), which the edge
 *   forwards to the API.
 */
export { isLightorHost };

const PRODUCTION_API = 'https://api.lightor.app/api';
const DEVELOPMENT_API = 'http://localhost:3000/api';

/** A business's own domain, not `<name>.lightor.app` or a developer's machine. */
export const onOutsideHost = (hostname: string = window.location.hostname): boolean => !isLightorHost(hostname);

/** The API's root, without a trailing slash: the page's own origin on an outside host. */
export const apiRoot = (
  location: Pick<Location, 'hostname' | 'origin'> = window.location,
  production: boolean = import.meta.env.PROD
): string => {
  if (!isLightorHost(location.hostname)) return `${location.origin}/api`;
  return production ? PRODUCTION_API : DEVELOPMENT_API;
};

/** The name an outside host turned out to be, kept per host. */
let known: { host: string; name: string } | null = null;
/** The one question to the API about this host. */
let asked: { host: string; answer: Promise<Record<string, unknown>> } | null = null;

/**
 * The site's name when it is known now: always on a Lightor host; on an
 * outside host once the inlined config or the API has named it, else null.
 */
export const siteNameNow = (): string | null => {
  const host = window.location.hostname;
  if (isLightorHost(host)) return host.split('.')[0];
  if (known?.host === host) return known.name;
  const inline = readInlineConfig(document, host);
  if (!inline) return null;
  known = { host, name: inline.subDomain };
  return inline.subDomain;
};

/**
 * The public config of the site an outside host belongs to, straight from
 * the API (what `/web-configs/subdomain/<name>` answers). Asked once and
 * shared; a failed answer is forgotten, so a later caller may ask again.
 * Rejects as the config route does: 404 no such site, 403 not live.
 */
export const outsideHostConfig = (): Promise<Record<string, unknown>> => {
  const host = window.location.hostname;
  if (asked?.host === host) return asked.answer;
  const answer = axios
    .get<{ success?: boolean; data?: Record<string, unknown> }>(
      `${apiRoot()}/web-configs/host/${encodeURIComponent(plainHost(host))}`
    )
    .then((response) => {
      const data = response.data?.data;
      const name = response.data?.success && data ? data.subDomain : null;
      if (!data || typeof name !== 'string' || !name) throw new Error('Failed to get web config');
      known = { host, name };
      return data;
    });
  asked = { host, answer };
  answer.catch(() => {
    if (asked?.answer === answer) asked = null;
  });
  return answer;
};

/** The site's name, waiting for the API when an outside host came without an inlined config. */
export const siteName = (): Promise<string> => {
  const now = siteNameNow();
  if (now !== null) return Promise.resolve(now);
  return outsideHostConfig().then((data) => data.subDomain as string);
};

/**
 * Runs `call` with the site's name: at once when it is known (every Lightor
 * host), else when the API has named this host.
 */
export const withSiteName = <T>(call: (name: string) => Promise<T>): Promise<T> => {
  const now = siteNameNow();
  return now !== null ? call(now) : siteName().then(call);
};

/** The visitor check's options a call site may set; the frame takes the same ones. */
export interface PassFrameOptions {
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'flexible';
  appearance?: 'always' | 'execute' | 'interaction-only';
  language?: string;
}

/** Where the visitor check's frame lives: the site's Lightor address, the one host Turnstile knows. */
export const passFrameOrigin = (name: string): string => `https://${name}.lightor.app`;

/**
 * The frame's address for a page on `parent` (an outside host), with the
 * widget's options under the names the edge reads. The frame posts its
 * messages to `https://<parent>` only.
 */
export const passFrameUrl = (name: string, parent: string, options: PassFrameOptions = {}): string => {
  const query = new URLSearchParams({ parent });
  if (options.theme) query.set('theme', options.theme);
  if (options.language) query.set('lang', options.language);
  if (options.appearance) query.set('appearance', options.appearance);
  if (options.size) query.set('size', options.size);
  return `${passFrameOrigin(name)}/__lt-pass?${query.toString()}`;
};

/** Test hook: a fresh page. */
export const resetSiteForTests = (): void => {
  known = null;
  asked = null;
};

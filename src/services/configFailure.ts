/**
 * Why the site's config could not be loaded (LT-200), and what to do about it.
 *
 * - `not-found`: no business at this address — the NotFound page.
 * - `inactive`: the business exists but its site is not live — the API
 *   answers 403 while the owner has not confirmed their email (or, on a
 *   legacy account, holds no subscription record). An expected state, not a
 *   crash: the SiteNotActive page, and nothing is reported.
 * - `error`: anything else (network, 5xx) — reported, then NotFound.
 */
export type ConfigFailure = 'not-found' | 'inactive' | 'error';

export const classifyConfigFailure = (err: unknown): ConfigFailure => {
  const e = err as { status?: number; response?: { status?: number } } | null | undefined;
  const status = e?.response?.status ?? e?.status;
  if (status === 404) return 'not-found';
  if (status === 403) return 'inactive';
  return 'error';
};

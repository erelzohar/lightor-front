/**
 * Links the owner typed, made safe to follow (LT-315).
 *
 * Social links reach `href` and `window.open` straight from the site's
 * config, and the server only checks that they are strings. React 18 does
 * not block `javascript:` URLs in production, so a link like
 * `javascript:fetch(…)` ran the owner's script on every visitor who clicked
 * the icon — on a lightor.app subdomain, same-site with the dashboard and the
 * API. Only http and https survive here; anything else is dropped, not
 * repaired, because there is no right guess for what a broken link meant.
 */

/** The URL itself when it is http(s), otherwise null (javascript:, data:, junk). */
export const safeHttpUrl = (url: unknown): string | null => {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
};

/**
 * Open an outside link in a new tab — only an http(s) one, and without
 * handing that page `window.opener`, so it cannot navigate this tab
 * somewhere else behind the visitor's back (reverse tabnabbing).
 */
export const openExternal = (url: unknown): void => {
  const safe = safeHttpUrl(url);
  if (safe) window.open(safe, '_blank', 'noopener,noreferrer');
};

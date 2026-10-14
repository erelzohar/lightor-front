/**
 * Whether this page waits for an editor's PREVIEW_DATA instead of loading
 * its own config (LT-315, security I7).
 *
 * Only a page inside a frame — the register wizard's and the dashboard's
 * previews — has a parent to send it. `?preview` on a top-level visit used
 * to do the same, so a crafted link showed visitors an empty site: the page
 * waited for data nobody would send, then fell to NotFound. The flag still
 * works top-level in a dev build, for the local booking-flow harness that
 * opens `localhost/?preview` and posts the config from the page's own
 * console (Vite drops that branch from the production bundle).
 */
export const awaitsPreviewData = (
  win: Pick<Window, 'self' | 'top' | 'location'> = window,
  dev: boolean = import.meta.env.DEV
): boolean => {
  if (win.self !== win.top) return true;
  return dev && new URLSearchParams(win.location.search).has('preview');
};

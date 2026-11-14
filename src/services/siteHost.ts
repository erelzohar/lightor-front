/**
 * LT-661: which kind of host a page is on. The rule alone, with nothing to
 * import, so the edge shell's reader and `site.ts` can both use it.
 */

/** A hostname as it is compared and sent: lower case, no trailing dot. */
export const plainHost = (hostname: string): string => hostname.trim().toLowerCase().replace(/\.$/, '');

const LIGHTOR_ZONE = 'lightor.app';
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * A Lightor host is where the site has always lived: `<name>.lightor.app`,
 * and a developer's machine (localhost, `<name>.localhost`, an IP address,
 * a bare machine name). Anything else is an outside host: a business's own
 * domain, which is always a name of two labels or more.
 */
export const isLightorHost = (hostname: string): boolean => {
  const host = plainHost(hostname);
  if (!host) return true;
  if (host === LIGHTOR_ZONE || host.endsWith(`.${LIGHTOR_ZONE}`)) return true;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (IPV4.test(host) || host.includes(':') || host.startsWith('[')) return true;
  return !host.includes('.');
};

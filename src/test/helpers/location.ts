import { vi } from 'vitest';

/**
 * The booking site reads two things off the URL and both are load-bearing:
 * the subdomain, which is how a request is scoped to one business, and
 * `?manageToken=…`, which is the authority to read or change a booking
 * (LT-013). jsdom serves everything from localhost and will not let either be
 * spied on, but `window.location` itself is configurable — so swap it.
 */
const original = window.location;

export const stubLocation = (url: string) => {
  const parsed = new URL(url);

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      href: parsed.href,
      origin: parsed.origin,
      protocol: parsed.protocol,
      host: parsed.host,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      replace: vi.fn(),
      assign: vi.fn(),
      reload: vi.fn(),
      toString: () => parsed.href,
    },
  });
};

export const restoreLocation = () => {
  Object.defineProperty(window, 'location', { configurable: true, value: original });
};

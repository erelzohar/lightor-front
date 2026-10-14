import { lazy, type ComponentType } from 'react';

/**
 * A lazily loaded extra the page can live without (LT-315, review M5).
 *
 * A chunk can fail to arrive: every deploy replaces the build's `assets/`,
 * so a tab opened before it asks for a file name that no longer exists, and
 * a flaky phone connection does the same. React.lazy turns that into a
 * thrown error, and the nearest boundary then swapped a whole section — on a
 * Plus site, Lighty with the call and WhatsApp buttons in his header — for
 * "Something went wrong". Here a failed load renders nothing instead, so
 * whatever the page shows until the extra arrives (Lighty's picture) simply
 * stays.
 */
export const lazyOptional = <P extends object>(load: () => Promise<{ default: ComponentType<P> }>) =>
  lazy(() =>
    load().catch((err: unknown) => {
      console.warn('[lightor] an optional chunk failed to load', err);
      return { default: (() => null) as ComponentType<P> };
    })
  );

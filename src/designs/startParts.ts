import { readInlineConfig } from '../services/edgeShell';
import { WebsiteConfig } from '../models/WebsiteConfig';
import { partsFor, preloadParts } from './parts';

/**
 * LT-603: the parts this page draws start downloading before React does,
 * from the config the edge shell inlined (LT-194); App waits for the same
 * downloads before it shows the page. A preview has no inline config: its
 * parts load as its configs arrive.
 */
export const startPartsForThisPage = (): void => {
  try {
    const inline = readInlineConfig(document, window.location.hostname);
    const config = inline ? WebsiteConfig.fromJSON(inline.config) : null;
    void preloadParts(partsFor(config, window.location.pathname).now);
  } catch {
    // App reads the config again and loads what it needs then.
  }
};

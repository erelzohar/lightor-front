type Translate = (key: string, opts?: { defaultValue?: string }) => string;
/** Anything with a service's name and price — parsed or raw config. */
type Listed = { name?: string | null; price?: unknown } | null | undefined;

/** LT-220: a listed service shows a price — only then is the section a price list. */
export const showsPrices = (types: Listed[] | undefined): boolean =>
  (types ?? []).some((a) => !!a?.name && !!String(a.price ?? '').trim());

/**
 * LT-220: the services section's heading (ledger and price cards). The
 * owner's own title when there is one (`components.services.title`, which
 * the AI editor sets); otherwise "the price list" only when a service shows
 * a price, and "the services" when none does. It used to be "המחירון"
 * always, with no field behind it, so the AI editor could not rename it.
 */
export const servicesHeading = (title: string | undefined, types: Listed[] | undefined, t: Translate, language: string): string => {
  const own = title?.trim();
  if (own) return own;
  return showsPrices(types)
    ? t('services.ledger_title', { defaultValue: language === 'he' ? 'המחירון' : 'Prices' })
    : t('services.list_title', { defaultValue: language === 'he' ? 'השירותים' : 'Services' });
};

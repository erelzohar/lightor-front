/**
 * LT-395: each business prices in its own currency. The AI picks it from the
 * business's country when it builds the site and the owner can change it in
 * Settings; configs from before it are in shekels.
 */
export const CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];
export const DEFAULT_CURRENCY: Currency = 'ILS';

const SYMBOL: Record<Currency, string> = { ILS: '₪', USD: '$', EUR: '€', GBP: '£' };

export const currencyOf = (raw: unknown): Currency => {
  const code = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  return (CURRENCIES as readonly string[]).includes(code) ? (code as Currency) : DEFAULT_CURRENCY;
};

/**
 * Prices arrive as free strings ('70', '100 ₪', 'from 20'): the sign goes in
 * front of a plain number only, anything else stays as the owner wrote it.
 */
export const formatPrice = (price: string | undefined, currency?: unknown): string => {
  const p = price?.trim() ?? '';
  if (!p) return '';
  return /^\d+(\.\d+)?$/.test(p) ? `${SYMBOL[currencyOf(currency)]}${p}` : p;
};

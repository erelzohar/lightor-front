/**
 * WhatsApp links (LT-177).
 *
 * Owners store their number the way they type it, in local Israeli form
 * ("0508801872"). A link built from that — wa.me/0508801872 — has no country
 * code, so WhatsApp cannot place it and the chat never opens. WhatsApp's
 * documented form is the international number in digits only, with no plus,
 * no leading zero and no dashes: wa.me/972508801872.
 *
 * Same rule as the dashboard's helper (lightor-dashboard src/utils/phone.ts,
 * LT-122), so both apps link to the same chat. Israel-only for now: a local
 * number is assumed to be Israeli, and a number already in international form
 * is left as it is.
 */

const DEFAULT_COUNTRY_CODE = '972';

const digitsOf = (phone: string | null | undefined): string => (phone ?? '').replace(/\D/g, '');

/** "0508801872" → "972508801872"; "+972508801872" and "050-880-1872" likewise. */
export const whatsAppNumber = (phone: string | null | undefined): string => {
  const digits = digitsOf(phone);
  if (digits.startsWith(DEFAULT_COUNTRY_CODE)) return digits;
  if (digits.startsWith('0')) return `${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
  return digits;
};

export const whatsAppHref = (phone: string | null | undefined): string =>
  `https://wa.me/${whatsAppNumber(phone)}`;

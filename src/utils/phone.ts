/**
 * Business phone helpers (LT-177, LT-404).
 *
 * The backend stores the business phone (`contact.phone`) in E.164
 * ("+972501234567"), but older values may still be in any shape the owner
 * typed: "050-123 4567", "0501234567", "972501234567", "+972 050-1234567",
 * "00972501234567", or a foreign "+14155551234". Every call link, WhatsApp
 * link and phone shown as text on a site goes through these helpers, so the
 * same number always dials, chats and reads the same way.
 *
 * WhatsApp's documented link form is the international number in digits only,
 * with no plus, no leading zero and no dashes: wa.me/972508801872. Same rule as
 * the dashboard's helper (lightor-dashboard src/utils/phone.ts, LT-122). A
 * local number is assumed to be Israeli. Israeli landlines and VoIP lines
 * (02, 03, 04, 08, 09, 07x) get no WhatsApp link; a foreign number does, since
 * we cannot tell its kind without a numbering-plan library.
 *
 * The edge worker (lightor-edge src/phone.ts) carries a copy of toE164 and
 * displayPhone: keep the two in step.
 */

type Raw = string | null | undefined;

const IL = '972';

/** Normalise any stored shape to E.164 ("+972501234567"), or null. */
export const toE164 = (raw: Raw): string | null => {
  const s = (raw ?? '').trim();
  if (!s) return null;
  let plus = s.startsWith('+');
  let d = s.replace(/\D/g, '');
  if (!plus && d.startsWith('00')) {
    plus = true;
    d = d.slice(2);
  }
  if (plus) {
    // "+972 050-1234567": the trunk 0 has no place after the country code.
    if (d.startsWith(`${IL}0`)) d = IL + d.slice(4);
    return d.length >= 8 && d.length <= 15 ? `+${d}` : null;
  }
  if (d.startsWith(IL) && d.length >= 11 && d.length <= 13) {
    if (d.startsWith(`${IL}0`)) d = IL + d.slice(4);
    return d.length >= 11 && d.length <= 12 ? `+${d}` : null;
  }
  if (d.startsWith('0') && (d.length === 9 || d.length === 10)) return `+${IL}${d.slice(1)}`;
  if (d.startsWith('5') && d.length === 9) return `+${IL}${d}`;
  return null;
};

/** The national part of an Israeli E.164 number ("501234567"), or null. */
const israeliNational = (e164: string | null): string | null =>
  e164 && e164.startsWith(`+${IL}`) ? e164.slice(1 + IL.length) : null;

/**
 * Can this number take a WhatsApp chat? Israeli mobiles (national part starts
 * with 5) yes; Israeli landlines/VoIP no; a foreign number yes (we cannot
 * tell); an unparseable one no.
 */
export const isMobile = (raw: Raw): boolean => {
  const e164 = toE164(raw);
  if (!e164) return false;
  const national = israeliNational(e164);
  return national === null ? true : national.startsWith('5');
};

/** "tel:+972501234567"; an unparseable number keeps its digits and plus. */
export const telHref = (raw: Raw): string =>
  `tel:${toE164(raw) ?? (raw ?? '').replace(/[^0-9+]/g, '')}`;

/** "0508801872" → "972508801872"; '' when the number cannot be parsed. */
export const whatsAppNumber = (raw: Raw): string => toE164(raw)?.slice(1) ?? '';

/** wa.me link for a number that can take WhatsApp; null for a landline or junk. */
export const whatsAppHref = (raw: Raw, text?: string): string | null => {
  if (!isMobile(raw)) return null;
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${whatsAppNumber(raw)}${query}`;
};

/**
 * The phone as a visitor reads it. Israeli numbers in national form with one
 * hyphen ("050-1234567", "077-1234567", "03-1234567"); a foreign number as
 * its E.164; anything unparseable as typed (trimmed).
 */
export const displayPhone = (raw: Raw): string => {
  const e164 = toE164(raw);
  if (!e164) return (raw ?? '').trim();
  const national = israeliNational(e164);
  if (national === null) return e164;
  // 1-700/1-800 lines are dialled without a trunk 0.
  if (national.startsWith('1')) return national;
  const local = `0${national}`;
  const prefix = /^0[57]/.test(local) ? 3 : 2;
  return `${local.slice(0, prefix)}-${local.slice(prefix)}`;
};

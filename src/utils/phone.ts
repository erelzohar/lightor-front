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
 *
 * LT-677: numbers abroad. This app has no phone library and stays light, so
 * the countries it knows by more than their E.164 are the few in COUNTRIES
 * below: each says how a number written locally is read, typed and shown.
 * A local number is read as Israeli unless the caller names another country.
 */

type Raw = string | null | undefined;

const IL = '972';

/** The countries this app can read a locally written number in. */
export type PhoneCountry = 'IL' | 'US';

interface CountryRule {
  /** The dial code, digits only. */
  dial: string;
  /** What a number written locally starts with before its national part. */
  trunk: string;
  /** A number as the field shows it, for the empty field and the "not valid" text. */
  example: string;
  /**
   * The national part (no trunk prefix, digits only) of a number written
   * locally; null when the digits are not a whole number of this country.
   */
  national: (digits: string) => string | null;
  /** Can it take a text or a WhatsApp chat, as far as its digits tell. */
  mobile: (national: string) => boolean;
  /** The field's text while a local number is typed, from its digits. */
  typing: (digits: string) => string;
  /** The national part as a visitor reads it. */
  display: (national: string) => string;
}

/** "2125550123" -> "(212) 555-0123", a part at a time while it is typed. */
const usTyping = (digits: string): string => {
  // A leading 1 is the country code, never the start of an area code.
  const d = digits.replace(/^1/, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

const COUNTRIES: Record<PhoneCountry, CountryRule> = {
  IL: {
    dial: IL,
    trunk: '0',
    example: '0501234567',
    national: (d) => {
      if (d.startsWith('0') && (d.length === 9 || d.length === 10)) return d.slice(1);
      if (d.startsWith('5') && d.length === 9) return d;
      return null;
    },
    mobile: (national) => national.startsWith('5'),
    // As the forms always took it: digits alone, ten at most.
    typing: (d) => d.slice(0, 10),
    display: (national) => {
      // 1-700/1-800 lines are dialled without a trunk 0.
      if (national.startsWith('1')) return national;
      const local = `0${national}`;
      const prefix = /^0[57]/.test(local) ? 3 : 2;
      return `${local.slice(0, prefix)}-${local.slice(prefix)}`;
    },
  },
  US: {
    dial: '1',
    trunk: '',
    example: '(212) 555-0123',
    // Ten digits, the area code and the exchange each starting 2-9. The same
    // shape covers all of +1 (Canada too): the server tells them apart.
    national: (d) => {
      const n = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
      return /^[2-9]\d{2}[2-9]\d{6}$/.test(n) ? n : null;
    },
    // No telling a mobile from a landline by the digits.
    mobile: () => true,
    typing: usTyping,
    display: (national) => (/^\d{10}$/.test(national) ? usTyping(national) : `+1${national}`),
  },
};

/** The country every field starts from, and the one a bare number is read in. */
export const HOME_COUNTRY: PhoneCountry = 'IL';

/** The countries this app knows, Israel first. */
export const PHONE_COUNTRIES = Object.keys(COUNTRIES) as PhoneCountry[];

export const isPhoneCountry = (code: unknown): code is PhoneCountry =>
  typeof code === 'string' && Object.prototype.hasOwnProperty.call(COUNTRIES, code);

/** "972", "1". */
export const dialCode = (country: PhoneCountry): string => COUNTRIES[country].dial;

/** A number of that country as its field shows it: "(212) 555-0123". */
export const phoneExample = (country: PhoneCountry): string => COUNTRIES[country].example;

/**
 * That example for the middle of a sentence. In Hebrew or Arabic a bare
 * "(212) 555-0123" is drawn with its two halves swapped: the isolate marks
 * around it keep the number whole and left to right. They show nothing.
 */
export const phoneExampleInText = (country: PhoneCountry): string => `\u2066${COUNTRIES[country].example}\u2069`;

/**
 * Normalise any stored shape to E.164 ("+972501234567"), or null. A number
 * written without a country code is read in `country` (Israel by default).
 */
export const toE164 = (raw: Raw, country: PhoneCountry = HOME_COUNTRY): string | null => {
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
  // An Israeli number written with its country code and no plus.
  if (country === 'IL' && d.startsWith(IL) && d.length >= 11 && d.length <= 13) {
    if (d.startsWith(`${IL}0`)) d = IL + d.slice(4);
    return d.length >= 11 && d.length <= 12 ? `+${d}` : null;
  }
  const national = COUNTRIES[country].national(d);
  return national ? `+${COUNTRIES[country].dial}${national}` : null;
};

/**
 * The country of a number, among the ones this app knows: "+1..." is 'US',
 * "050..." is 'IL'. Null for any other country and for an unparseable number.
 */
export const phoneCountryOf = (raw: Raw, country: PhoneCountry = HOME_COUNTRY): PhoneCountry | null => {
  const e164 = toE164(raw, country);
  if (!e164) return null;
  return PHONE_COUNTRIES.find((code) => e164.startsWith(`+${COUNTRIES[code].dial}`)) ?? null;
};

/**
 * The site's own country: the country of its business phone (`contact.phone`,
 * stored in E.164). Israel when the phone is missing or of a country this app
 * does not know.
 */
export const siteCountry = (businessPhone: Raw): PhoneCountry => phoneCountryOf(businessPhone) ?? HOME_COUNTRY;

/** The number's known country and its national part, or null. */
const known = (e164: string | null): { rule: CountryRule; national: string } | null => {
  const code = phoneCountryOf(e164);
  if (!e164 || !code) return null;
  return { rule: COUNTRIES[code], national: e164.slice(1 + COUNTRIES[code].dial.length) };
};

/**
 * Can this number take a WhatsApp chat? Israeli mobiles (national part starts
 * with 5) yes; Israeli landlines/VoIP no; a foreign number yes (we cannot
 * tell); an unparseable one no.
 */
export const isMobile = (raw: Raw, country?: PhoneCountry): boolean => {
  const e164 = toE164(raw, country);
  if (!e164) return false;
  const found = known(e164);
  return found ? found.rule.mobile(found.national) : true;
};

/** "tel:+972501234567"; an unparseable number keeps its digits and plus. */
export const telHref = (raw: Raw, country?: PhoneCountry): string =>
  `tel:${toE164(raw, country) ?? (raw ?? '').replace(/[^0-9+]/g, '')}`;

/** "0508801872" → "972508801872"; '' when the number cannot be parsed. */
export const whatsAppNumber = (raw: Raw, country?: PhoneCountry): string => toE164(raw, country)?.slice(1) ?? '';

/** wa.me link for a number that can take WhatsApp; null for a landline or junk. */
export const whatsAppHref = (raw: Raw, text?: string, country?: PhoneCountry): string | null => {
  if (!isMobile(raw, country)) return null;
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${whatsAppNumber(raw, country)}${query}`;
};

/**
 * The phone as a visitor reads it. Israeli numbers in national form with one
 * hyphen ("050-1234567", "077-1234567", "03-1234567"); a +1 number as
 * "(212) 555-0123"; any other foreign number as its E.164; anything
 * unparseable as typed (trimmed).
 */
export const displayPhone = (raw: Raw, country?: PhoneCountry): string => {
  const e164 = toE164(raw, country);
  if (!e164) return (raw ?? '').trim();
  const found = known(e164);
  return found ? found.rule.display(found.national) : e164;
};

/* ------------------------------------------------------------------------
 * A phone field (LT-677): the booking form's and the lead form's. The field
 * holds the text as it shows and the country a local number is read in.
 * ---------------------------------------------------------------------- */

/** What a phone field holds. */
export interface PhoneEntry {
  text: string;
  country: PhoneCountry;
}

/**
 * The field after a keystroke or a paste. With one country on offer it is
 * what the forms always did (digits alone, ten at most). With more, a local
 * number is typed in the chip's country's form, and a number that starts
 * with "+" or "00" names its own country: when that is an offered one the
 * chip moves to it and the text becomes the local form; any other stays as
 * "+" and its digits.
 */
export const typePhone = (typed: string, country: PhoneCountry, offered: readonly PhoneCountry[]): PhoneEntry => {
  const digits = typed.replace(/\D/g, '');
  if (offered.length < 2) return { text: COUNTRIES[country].typing(digits), country };
  const plus = typed.trimStart().startsWith('+');
  if (!plus && !digits.startsWith('00')) return { text: COUNTRIES[country].typing(digits), country };
  const rest = plus ? digits : digits.slice(2);
  const named = offered.find((code) => rest.startsWith(COUNTRIES[code].dial));
  if (!named) return { text: `+${rest.slice(0, 15)}`, country };
  const rule = COUNTRIES[named];
  const national = rest.slice(rule.dial.length);
  // "+972 050..." and "+972 50..." are the same number.
  const local = rule.trunk + (rule.trunk && national.startsWith(rule.trunk) ? national.slice(rule.trunk.length) : national);
  return { text: rule.typing(local), country: named };
};

/** The field's text for another country: the same digits, typed there. */
export const retypePhone = (text: string, country: PhoneCountry): string =>
  COUNTRIES[country].typing(text.replace(/\D/g, ''));

/**
 * A stored number as a field holds it: "+12125550123" is the US chip and
 * "(212) 555-0123". Null when it is not an E.164 number of a country this
 * app knows: the field then keeps the value as it is.
 */
export const phoneEntryOf = (stored: Raw): PhoneEntry | null => {
  const s = (stored ?? '').trim();
  const country = s.startsWith('+') ? phoneCountryOf(s) : null;
  if (!country) return null;
  const rule = COUNTRIES[country];
  return { country, text: rule.typing(rule.trunk + toE164(s)!.slice(1 + rule.dial.length)) };
};

/** Why a field's number is not taken. The first three are the Israeli rules the forms always had. */
export type PhoneProblem = 'start' | 'length' | 'digits' | 'invalid' | 'country';

/** A number the field takes: what the API gets, and whether it is a number abroad. */
export interface PhoneReading {
  /** An Israeli number as typed ("0501234567", as always); a number abroad in E.164. */
  value: string;
  /** A number abroad: its code goes through the code frame, never the SMS route. */
  abroad: boolean;
}

/**
 * Reads a field. An Israeli number passes the checks the forms always made,
 * in their order, and is sent as it was typed. A local number of a country
 * abroad must be a whole number there. A number written with "+" belongs to
 * a country the field does not offer: refused, unless `anyPlus` (the lead
 * form, where no code is sent) and it looks like a number.
 */
export const readPhone = (
  text: string,
  country: PhoneCountry,
  options: { anyPlus?: boolean } = {},
): PhoneReading | { problem: PhoneProblem } => {
  if (text.startsWith('+')) {
    const e164 = toE164(text);
    if (!e164) return { problem: 'invalid' };
    return options.anyPlus ? { value: e164, abroad: true } : { problem: 'country' };
  }
  if (country === 'IL') {
    if (!text.startsWith('05')) return { problem: 'start' };
    if (text.length !== 10) return { problem: 'length' };
    if (!/^\d+$/.test(text)) return { problem: 'digits' };
    return { value: text, abroad: false };
  }
  const e164 = toE164(text, country);
  return e164 ? { value: e164, abroad: true } : { problem: 'invalid' };
};

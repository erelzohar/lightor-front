import { useEffect, useSyncExternalStore } from 'react';
import axios from 'axios';
import globals from './globals';
import { HOME_COUNTRY, isPhoneCountry, type PhoneCountry } from '../utils/phone';

/**
 * LT-677: the countries a phone field on the site offers. Israel always;
 * the API names the countries abroad whose numbers it takes
 * (`GET /messaging/phone-countries` -> `{ data: { home, abroad } }`).
 *
 * Asked once per page, and only when a visitor is on the way to a phone
 * field. Until the answer is in, and after any failure (an older API answers
 * 404), a field offers Israel alone: exactly the site as it was before
 * numbers abroad existed.
 *
 * LT-716: the same answer names where a customer's text reaches
 * (`data.sms`: Israel, and the countries abroad with an SMS sender). A number
 * of any other country gets its updates on WhatsApp. Until the answer is in,
 * and from an older API that does not name them, the list is null: the
 * booking form offers its SMS / WhatsApp switch as it always did.
 */

/** One list object while nothing changes, so a field reading it never redraws for nothing. */
const HOME_ONLY: readonly PhoneCountry[] = [HOME_COUNTRY];

let offered: readonly PhoneCountry[] = HOME_ONLY;
let textable: readonly string[] | null = null;
let asked: Promise<readonly PhoneCountry[]> | null = null;
/**
 * A test never asks an API by accident (a developer's own machine may run
 * one with a country open): the test that wants the request says so.
 */
let asks = import.meta.env.MODE !== 'test';
const listeners = new Set<() => void>();

const sameList = (a: readonly string[] | null, b: readonly string[] | null): boolean =>
  a === b || (!!a && !!b && a.length === b.length && a.every((code, i) => code === b[i]));

const set = (next: readonly PhoneCountry[], nextTextable: readonly string[] | null = textable) => {
  if (sameList(next, offered) && sameList(nextTextable, textable)) return;
  if (!sameList(next, offered)) offered = next;
  if (!sameList(nextTextable, textable)) textable = nextTextable;
  listeners.forEach((listener) => listener());
};

/** The API's answer as a list: Israel, then the open countries this app can read a number in. */
const listOf = (data: unknown): readonly PhoneCountry[] => {
  const abroad = (data as { data?: { abroad?: unknown } } | null)?.data?.abroad;
  if (!Array.isArray(abroad)) return HOME_ONLY;
  const open = abroad.filter(isPhoneCountry).filter((code) => code !== HOME_COUNTRY);
  return open.length ? [HOME_COUNTRY, ...new Set(open)] : HOME_ONLY;
};

/** Where a text reaches, as the API named it: Israel always, then two-letter codes. Null when it named none. */
const textableOf = (data: unknown): readonly string[] | null => {
  const sms = (data as { data?: { sms?: unknown } } | null)?.data?.sms;
  if (!Array.isArray(sms)) return null;
  const codes = sms.filter((code): code is string => typeof code === 'string' && /^[A-Z]{2}$/.test(code));
  return [...new Set([HOME_COUNTRY, ...codes])];
};

/** Asks the API, once for the page's life; every later call shares the answer. Never rejects. */
export const loadPhoneCountries = (): Promise<readonly PhoneCountry[]> => {
  if (asked) return asked;
  if (!asks) return Promise.resolve(offered);
  asked = axios
    .get<unknown>(`${globals.messagingUrl}/phone-countries`)
    .then((response) => ({ list: listOf(response.data), sms: textableOf(response.data) }))
    .catch(() => ({ list: HOME_ONLY, sms: null }))
    .then(({ list, sms }) => {
      set(list, sms);
      return offered;
    });
  return asked;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The countries on offer right now, without asking. */
export const phoneCountriesNow = (): readonly PhoneCountry[] => offered;

/**
 * The countries a field offers. `active` is when to ask the API: once the
 * visitor is on the way to the field, not on every page view.
 */
export const usePhoneCountries = (active = true): readonly PhoneCountry[] => {
  useEffect(() => {
    if (active) void loadPhoneCountries();
  }, [active]);
  return useSyncExternalStore(subscribe, phoneCountriesNow, phoneCountriesNow);
};

/** LT-716: where a customer's text reaches right now, without asking; null when the API has not named it. */
export const smsCountriesNow = (): readonly string[] | null => textable;

/** LT-716: does a text reach a number of this country? Yes while the API has named no list. */
export const textReaches = (country: string, sms: readonly string[] | null = textable): boolean =>
  sms === null || sms.includes(country);

/** LT-716: the countries a text reaches, as the API named them (asked by `usePhoneCountries`); null until then. */
export const useSmsCountries = (): readonly string[] | null =>
  useSyncExternalStore(subscribe, smsCountriesNow, smsCountriesNow);

/**
 * Test-only: forget the answer. `offered` puts a list in place as if the API
 * had named it; `sms` the countries a text reaches (none named: null, an
 * older API); `ask` lets the next field really ask (a mocked) API.
 */
export const resetPhoneCountriesForTests = (
  options: { offered?: PhoneCountry[]; sms?: string[] | null; ask?: boolean } = {}
): void => {
  asked = null;
  asks = options.ask === true;
  set(options.offered && options.offered.length > 1 ? options.offered : HOME_ONLY, options.sms ?? null);
};

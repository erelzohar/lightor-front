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
 */

/** One list object while nothing changes, so a field reading it never redraws for nothing. */
const HOME_ONLY: readonly PhoneCountry[] = [HOME_COUNTRY];

let offered: readonly PhoneCountry[] = HOME_ONLY;
let asked: Promise<readonly PhoneCountry[]> | null = null;
/**
 * A test never asks an API by accident (a developer's own machine may run
 * one with a country open): the test that wants the request says so.
 */
let asks = import.meta.env.MODE !== 'test';
const listeners = new Set<() => void>();

const set = (next: readonly PhoneCountry[]) => {
  if (next.length === offered.length && next.every((code, i) => code === offered[i])) return;
  offered = next;
  listeners.forEach((listener) => listener());
};

/** The API's answer as a list: Israel, then the open countries this app can read a number in. */
const listOf = (data: unknown): readonly PhoneCountry[] => {
  const abroad = (data as { data?: { abroad?: unknown } } | null)?.data?.abroad;
  if (!Array.isArray(abroad)) return HOME_ONLY;
  const open = abroad.filter(isPhoneCountry).filter((code) => code !== HOME_COUNTRY);
  return open.length ? [HOME_COUNTRY, ...new Set(open)] : HOME_ONLY;
};

/** Asks the API, once for the page's life; every later call shares the answer. Never rejects. */
export const loadPhoneCountries = (): Promise<readonly PhoneCountry[]> => {
  if (asked) return asked;
  if (!asks) return Promise.resolve(offered);
  asked = axios
    .get<unknown>(`${globals.messagingUrl}/phone-countries`)
    .then((response) => listOf(response.data))
    .catch(() => HOME_ONLY)
    .then((list) => {
      set(list);
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

/**
 * Test-only: forget the answer. `offered` puts a list in place as if the API
 * had named it; `ask` lets the next field really ask (a mocked) API.
 */
export const resetPhoneCountriesForTests = (options: { offered?: PhoneCountry[]; ask?: boolean } = {}): void => {
  asked = null;
  asks = options.ask === true;
  set(options.offered && options.offered.length > 1 ? options.offered : HOME_ONLY);
};

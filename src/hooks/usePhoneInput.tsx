import { useCallback, useMemo, useState } from 'react';
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react';
import PhoneCountryChip from '../components/common/PhoneCountryChip';
import { usePhoneCountries } from '../services/phoneCountries';
import {
  HOME_COUNTRY,
  dialCode,
  phoneExample,
  readPhone,
  retypePhone,
  siteCountry,
  typePhone,
  type PhoneCountry,
  type PhoneProblem,
  type PhoneReading,
} from '../utils/phone';

/**
 * LT-677: what the booking form's and the lead form's phone field share.
 *
 * The form keeps the field's text, as it always did; this keeps the country
 * a local number is read in, and hands the form's own input what it needs:
 * the change handler, the country chip (only when the site takes numbers of
 * more than one country) and the reading of what was typed.
 *
 * With Israel alone on offer (always, until the API opens a country abroad)
 * everything here is what the forms did before: no chip, no placeholder,
 * digits only and ten at most, the three Israeli checks in their order, and
 * the number sent as it was typed.
 */

interface PhoneInputOptions {
  /** The field's text, kept by the form. */
  text: string;
  /** The form's own setter for that text. */
  onText: (text: string) => void;
  /** The business's phone (`contact.phone`): its country is where the field starts. */
  sitePhone?: string | null;
  /** When to ask the API which countries are open: once the visitor is on the way to the field. */
  active?: boolean;
  /** The lead form: no code is sent, so any number written with "+" and a country code passes. */
  anyPlus?: boolean;
}

export interface PhoneInput {
  /** The country a local number is read in. */
  country: PhoneCountry;
  /** The countries the chip lists; one means no chip. */
  countries: readonly PhoneCountry[];
  /** For the input's `onChange`. */
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  /** The chip, drawn where the field's icon was; absent with one country. */
  leading?: ReactNode;
  /** For the input itself beside the chip: the number reads left to right, clear of the chip. */
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  /** An example in the chip's country's form; empty with one country, as always. */
  placeholder: string;
  /** What the API gets, or why the number is not taken. */
  reading: PhoneReading | { problem: PhoneProblem };
  /** A value put in from outside (a booking being moved): its own country, or null to start over. */
  setCountry: (country: PhoneCountry | null) => void;
}

/**
 * The room the chip takes at the left of its field: its own padding, the
 * flag, the chevron and the gaps come to 4.5rem, and the dial code ("+972")
 * is narrower in the chip's small text than as many "0"s are in the
 * input's. A quarter rem more keeps the number off the chip.
 */
const chipRoom = (country: PhoneCountry): string => `calc(4.75rem + ${dialCode(country).length + 1}ch)`;

/**
 * The field re-forms what was typed ("2125550" -> "(212) 555-0"), which
 * throws the caret to the end. When the visitor was editing in the middle,
 * put it back after the digit it stood after.
 */
const keepCaret = (input: HTMLInputElement, typed: string, shown: string): void => {
  const at = input.selectionStart;
  if (at === null || at >= typed.length || typeof requestAnimationFrame !== 'function') return;
  const digitsBefore = typed.slice(0, at).replace(/\D/g, '').length;
  requestAnimationFrame(() => {
    if (input.value !== shown) return;
    let index = 0;
    for (let seen = 0; index < shown.length && seen < digitsBefore; index += 1) {
      if (/\d/.test(shown[index])) seen += 1;
    }
    try {
      input.setSelectionRange(index, index);
    } catch {
      // An input that keeps no selection: nothing to put back.
    }
  });
};

export function usePhoneInput({ text, onText, sitePhone, active = true, anyPlus = false }: PhoneInputOptions): PhoneInput {
  const open = usePhoneCountries(active);
  // The visitor's own choice: the chip, a number typed with its country
  // code, or simply having typed. Until then the field follows the site.
  const [chosen, setChosen] = useState<PhoneCountry | null>(null);
  const home = siteCountry(sitePhone);
  const country = chosen ?? (open.includes(home) ? home : HOME_COUNTRY);
  // A value put in from outside may be of a country the API did not name
  // (or has not named yet): the field offers it too, so it can be read.
  const countries = useMemo(() => (open.includes(country) ? open : [...open, country]), [open, country]);
  const many = countries.length > 1;

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const entry = typePhone(input.value, country, countries);
      if (many) keepCaret(input, input.value, entry.text);
      setChosen(entry.country);
      onText(entry.text);
    },
    [country, countries, many, onText],
  );

  const pick = useCallback(
    (next: PhoneCountry) => {
      setChosen(next);
      if (text) onText(retypePhone(text, next));
    },
    [text, onText],
  );

  const reading = useMemo(() => readPhone(text, country, { anyPlus: anyPlus && many }), [text, country, anyPlus, many]);

  return {
    country,
    countries,
    onChange,
    leading: many ? <PhoneCountryChip countries={countries} value={country} onChange={pick} /> : undefined,
    inputProps: many ? { dir: 'ltr', placeholder: phoneExample(country), style: { paddingLeft: chipRoom(country) } } : undefined,
    placeholder: many ? phoneExample(country) : '',
    reading,
    setCountry: setChosen,
  };
}

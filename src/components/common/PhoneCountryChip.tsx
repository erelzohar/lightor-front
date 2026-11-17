import React from 'react';
import Dropdown from '../ui/dropdown';
import { useLanguage } from '../../contexts/LanguageContext';
import { dialCode, type PhoneCountry } from '../../utils/phone';

/**
 * LT-677: the country chip of a phone field, for a site that takes numbers
 * of more than one country. A button with the country's flag and dial code
 * that opens the list of countries: the sites' own dropdown (ui/dropdown),
 * so it is a real listbox (arrows, Enter, Escape, typeahead, closes on a tap
 * outside) and its panel is drawn on <body>, where nothing clips it.
 *
 * The chip is the country a number written locally is read in. A field with
 * one country draws no chip at all.
 */

const FLAG_CLASS = 'h-3.5 w-5 shrink-0 rounded-[2px] ring-1 ring-black/10 dark:ring-white/25';

/** Small drawn flags: no image request, the same on every device. */
const FLAGS: Record<PhoneCountry, React.ReactElement> = {
  IL: (
    <svg viewBox="0 0 20 14" className={FLAG_CLASS} aria-hidden="true" focusable="false">
      <rect width="20" height="14" fill="#fff" />
      <path d="M0 2.6h20M0 11.4h20" stroke="#0038b8" strokeWidth="1.7" />
      <path d="M10 4.4 12.2 8.3H7.8ZM10 9.6 7.8 5.7h4.4Z" fill="none" stroke="#0038b8" strokeWidth="0.6" strokeLinejoin="round" />
    </svg>
  ),
  US: (
    <svg viewBox="0 0 20 14" className={FLAG_CLASS} aria-hidden="true" focusable="false">
      <rect width="20" height="14" fill="#fff" />
      <path d="M0 .54h20M0 2.69h20M0 4.85h20M0 7h20M0 9.15h20M0 11.31h20M0 13.46h20" stroke="#b22234" strokeWidth="1.08" />
      <rect width="8.6" height="7.54" fill="#3c3b6e" />
      <path d="M1.3 1.5h6.4M1.3 3.1h6.4M1.3 4.7h6.4M1.3 6.3h6.4" stroke="#fff" strokeWidth="0.6" strokeDasharray="0.6 0.85" strokeLinecap="round" />
    </svg>
  ),
};

/** The countries' names, in the locale files. */
const NAME_KEY: Record<PhoneCountry, string> = {
  IL: 'phone.country.IL',
  US: 'phone.country.US',
};

interface PhoneCountryChipProps {
  countries: readonly PhoneCountry[];
  value: PhoneCountry;
  onChange: (country: PhoneCountry) => void;
}

const PhoneCountryChip: React.FC<PhoneCountryChipProps> = ({ countries, value, onChange }) => {
  const { t } = useLanguage();
  const items = countries.map((code) => {
    const name = t(NAME_KEY[code]);
    return {
      value: code,
      text: name,
      label: (
        <span className="flex items-center gap-2">
          {FLAGS[code]}
          <span>{name}</span>
          <span dir="ltr" className="text-light-text/70 dark:text-dark-text/70">+{dialCode(code)}</span>
        </span>
      ),
    };
  });

  return (
    <Dropdown
      items={items}
      value={value}
      onChange={(code) => onChange(code as PhoneCountry)}
      ariaLabel={t('phone.chip', { country: t(NAME_KEY[value]), dial: dialCode(value) })}
      minPanelWidth={260}
      // The focus ring is the site's own (index.css), drawn inside the chip:
      // clear of the field's floating label and of its border.
      className="rounded-md px-2 py-1.5 text-sm font-medium text-light-text dark:text-dark-text hover:bg-primary/10 dark:hover:bg-primary-dark/15 transition-colors focus-visible:-outline-offset-2"
      face={() => (
        <span className="flex items-center gap-1.5" data-testid="phone-chip-face">
          {FLAGS[value]}
          <span dir="ltr">+{dialCode(value)}</span>
        </span>
      )}
    />
  );
};

export default PhoneCountryChip;

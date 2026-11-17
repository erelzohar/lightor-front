import { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { Phone } from 'lucide-react';
import { MaterialInput } from '../../components/Layout/Schedule/ScheduleForms';
import { usePhoneInput, type PhoneInput } from '../../hooks/usePhoneInput';
import { resetPhoneCountriesForTests } from '../../services/phoneCountries';
import { choose, optionOf } from '../helpers/dropdown';

/**
 * LT-677 - the phone field with a country chip. With one country it is the
 * field as it always was; with more, the chip is a listbox that says which
 * country a local number is read in, and a number typed with its country
 * code moves the chip by itself.
 */
let lang = 'en';
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${Object.values(params).join(' ')}` : key),
    language: lang,
  }),
}));
Element.prototype.scrollIntoView = vi.fn();

/** What the hook last handed the form. */
let latest: PhoneInput;

const Field = ({ sitePhone, anyPlus, start = '' }: { sitePhone?: string; anyPlus?: boolean; start?: string }) => {
  const [text, setText] = useState(start);
  const phone = usePhoneInput({ text, onText: setText, sitePhone, anyPlus });
  latest = phone;
  return (
    <MaterialInput
      icon={Phone}
      label="Phone"
      value={text}
      onChange={phone.onChange}
      type="tel"
      inputMode={phone.leading ? 'tel' : 'numeric'}
      pattern={phone.leading ? undefined : '[0-9]*'}
      placeholder={phone.placeholder}
      name="phone"
      id="phone"
      leading={phone.leading}
      inputProps={phone.inputProps}
    />
  );
};

/** The same field as the booking form drew it before numbers abroad. */
const FieldAsBefore = () => {
  const [text, setText] = useState('');
  return (
    <MaterialInput
      icon={Phone}
      label="Phone"
      value={text}
      onChange={(e) => setText(e.target.value.replace(/\D/g, '').slice(0, 10))}
      type="tel"
      inputMode="numeric"
      pattern="[0-9]*"
      name="phone"
      id="phone"
    />
  );
};

const input = () => screen.getByLabelText('Phone') as HTMLInputElement;
const chip = () => screen.getByRole('button', { name: /^phone\.chip/ });
const queryChip = () => screen.queryByRole('button', { name: /^phone\.chip/ });
const type = (value: string) => fireEvent.change(input(), { target: { value } });

describe('the phone field (LT-677)', () => {
  beforeEach(() => {
    lang = 'en';
    resetPhoneCountriesForTests();
  });
  afterEach(() => resetPhoneCountriesForTests());

  describe('with one country', () => {
    it('is the field as it always was: the same markup, no chip, no placeholder', () => {
      const now = render(<Field sitePhone="+972501234567" />);
      const html = now.container.innerHTML;
      now.unmount();
      const before = render(<FieldAsBefore />);
      expect(html).toBe(before.container.innerHTML);
      expect(queryChip()).toBeNull();
      expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('keeps digits only, ten at most, and reads the number by the Israeli rules', () => {
      render(<Field />);
      type('050-123 4567 89');
      expect(input().value).toBe('0501234567');
      expect(latest.reading).toEqual({ value: '0501234567', abroad: false });
      type('+1 212 555 0123');
      expect(input().value).toBe('1212555012');
      expect(latest.reading).toEqual({ problem: 'start' });
      expect(latest.country).toBe('IL');
    });

    it("stays Israel on a site abroad whose country is not open, plus numbers included", () => {
      render(<Field sitePhone="+12125550123" anyPlus />);
      expect(queryChip()).toBeNull();
      expect(latest.countries).toEqual(['IL']);
      type('+447911123456');
      expect(input().value).toBe('4479111234');
      expect(latest.reading).toEqual({ problem: 'start' });
    });
  });

  describe('with two countries', () => {
    beforeEach(() => resetPhoneCountriesForTests({ offered: ['IL', 'US'] }));

    it('draws a chip in place of the icon: a listbox button with the flag and the dial code', () => {
      const { container } = render(<Field />);
      expect(chip().getAttribute('aria-haspopup')).toBe('listbox');
      expect(chip().getAttribute('aria-expanded')).toBe('false');
      expect(chip().getAttribute('aria-label')).toBe('phone.chip phone.country.IL 972');
      expect(screen.getByTestId('phone-chip-face').textContent).toBe('+972');
      expect(chip().querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      // The field's own icon is gone; the number reads left to right, clear of the chip.
      expect(container.querySelector('.pointer-events-none')).toBeNull();
      expect(input().getAttribute('dir')).toBe('ltr');
      // Room for the chip: wider for "+972" than for "+1".
      expect(input().style.paddingLeft).toContain('4ch');
      expect(input().placeholder).toBe('0501234567');
      expect(input().hasAttribute('pattern')).toBe(false);
    });

    it('opens the list of countries, each with its name and dial code', () => {
      render(<Field />);
      expect(screen.queryByRole('listbox')).toBeNull();
      fireEvent.click(chip());
      expect(chip().getAttribute('aria-expanded')).toBe('true');
      const list = screen.getByRole('listbox');
      expect(list.id).toBe(chip().getAttribute('aria-controls'));
      const options = screen.getAllByRole('option');
      expect(options.map((option) => option.textContent)).toEqual(['phone.country.IL+972', 'phone.country.US+1']);
      expect(options[0].getAttribute('aria-selected')).toBe('true');
      expect(options[1].getAttribute('aria-selected')).toBe('false');
      // On <body>, where the booking flow's clip cannot cut it.
      expect(list.closest('[data-testid]')).toBeNull();
      expect(list.parentElement?.parentElement).toBe(document.body);
    });

    it('picking a country changes how a local number is read, typed and shown', async () => {
      render(<Field />);
      type('2125550123');
      expect(input().value).toBe('2125550123');
      expect(latest.reading).toEqual({ problem: 'start' });

      choose(chip(), 'US');
      expect(chip().getAttribute('aria-expanded')).toBe('false');
      await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
      expect(chip().getAttribute('aria-label')).toBe('phone.chip phone.country.US 1');
      expect(screen.getByTestId('phone-chip-face').textContent).toBe('+1');
      expect(input().placeholder).toBe('(212) 555-0123');
      expect(input().style.paddingLeft).toContain('2ch');
      // The digits already there are read in the new country.
      expect(input().value).toBe('(212) 555-0123');
      expect(latest.reading).toEqual({ value: '+12125550123', abroad: true });

      type('(212) 555-01');
      expect(latest.reading).toEqual({ problem: 'invalid' });

      choose(chip(), 'IL');
      type('0501234567');
      expect(latest.reading).toEqual({ value: '0501234567', abroad: false });
    });

    it('a pasted +1 number moves the chip to the US, a +972 number back to Israel', () => {
      render(<Field />);
      expect(latest.country).toBe('IL');
      type('+1 212 555 0123');
      expect(latest.country).toBe('US');
      expect(screen.getByTestId('phone-chip-face').textContent).toBe('+1');
      expect(input().value).toBe('(212) 555-0123');
      expect(latest.reading).toEqual({ value: '+12125550123', abroad: true });

      type('00972501234567');
      expect(latest.country).toBe('IL');
      expect(input().value).toBe('0501234567');
      expect(latest.reading).toEqual({ value: '0501234567', abroad: false });
    });

    it('a number of a country not on offer is refused where a code is sent, taken on the lead form', () => {
      const booking = render(<Field />);
      type('+44 7911 123456');
      expect(input().value).toBe('+447911123456');
      expect(latest.country).toBe('IL');
      expect(latest.reading).toEqual({ problem: 'country' });
      booking.unmount();

      render(<Field anyPlus />);
      type('+44 7911 123456');
      expect(latest.reading).toEqual({ value: '+447911123456', abroad: true });
    });

    it('works from the keyboard: arrows, Enter, Escape, and the focus back on the chip', async () => {
      render(<Field />);
      chip().focus();
      fireEvent.keyDown(chip(), { key: 'ArrowDown' });
      const list = screen.getByRole('listbox');
      expect(document.activeElement).toBe(list);
      const [israel, us] = screen.getAllByRole('option');
      expect(list.getAttribute('aria-activedescendant')).toBe(israel.id);
      fireEvent.keyDown(list, { key: 'ArrowDown' });
      expect(list.getAttribute('aria-activedescendant')).toBe(us.id);
      fireEvent.keyDown(list, { key: 'Enter' });
      expect(chip().getAttribute('aria-expanded')).toBe('false');
      expect(latest.country).toBe('US');
      expect(document.activeElement).toBe(chip());
      await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());

      fireEvent.keyDown(chip(), { key: 'Enter' });
      expect(chip().getAttribute('aria-expanded')).toBe('true');
      fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
      expect(chip().getAttribute('aria-expanded')).toBe('false');
      expect(latest.country).toBe('US');
      expect(document.activeElement).toBe(chip());
      await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    });

    it('closes on a tap outside, and keeps its country', async () => {
      render(<Field />);
      fireEvent.click(chip());
      expect(screen.getByRole('listbox')).toBeTruthy();
      fireEvent.pointerDown(document.body);
      expect(chip().getAttribute('aria-expanded')).toBe('false');
      await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
      expect(latest.country).toBe('IL');
    });

    it("starts from the site's own country when it is on offer, else from Israel", () => {
      const us = render(<Field sitePhone="+12125550123" />);
      expect(latest.country).toBe('US');
      expect(input().placeholder).toBe('(212) 555-0123');
      us.unmount();

      const uk = render(<Field sitePhone="+447911123456" />);
      expect(latest.country).toBe('IL');
      uk.unmount();

      render(<Field sitePhone="050-1234567" />);
      expect(latest.country).toBe('IL');
    });

    it('keeps the caret by its digit when the number is edited in the middle', async () => {
      const frames: FrameRequestCallback[] = [];
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return 1; });
      try {
        render(<Field sitePhone="+12125550123" />);
        type('2125550123');
        expect(input().value).toBe('(212) 555-0123');
        // The visitor deletes the "2" before the bracket: the caret stood after "21".
        const el = input();
        fireEvent.change(el, { target: { value: '(21) 555-0123', selectionStart: 3, selectionEnd: 3 } });
        expect(el.value).toBe('(215) 550-123');
        expect(el.selectionStart).toBe(el.value.length);
        act(() => frames.forEach((run) => run(0)));
        // Still after "21", not thrown to the end.
        expect(el.selectionStart).toBe(3);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it.each(['en', 'he', 'ar'])('has no accessibility violation axe can see, closed or open (%s)', async (language) => {
      lang = language;
      const { container } = render(<div dir={language === 'en' ? 'ltr' : 'rtl'}><Field /></div>);
      const RULES = {
        runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      };
      const closed = await axe.run(container, RULES);
      expect(closed.violations.map((violation) => violation.id)).toEqual([]);
      fireEvent.click(chip());
      const open = await axe.run(document.body, RULES);
      expect(open.violations.map((violation) => violation.id)).toEqual([]);
      // The number itself reads left to right whatever the page's direction.
      expect(input().getAttribute('dir')).toBe('ltr');
      expect(optionOf(chip(), 'US').querySelector('[dir="ltr"]')?.textContent).toBe('+1');
    });
  });

  describe('when the countries arrive after the field is on the page', () => {
    it('grows a chip around the same input, and keeps what was typed as an Israeli number', () => {
      render(<Field sitePhone="+12125550123" />);
      const before = input();
      type('0501234567');
      before.focus();

      act(() => resetPhoneCountriesForTests({ offered: ['IL', 'US'] }));
      expect(chip()).toBeTruthy();
      expect(input()).toBe(before);
      expect(document.activeElement).toBe(before);
      expect(input().value).toBe('0501234567');
      expect(latest.country).toBe('IL');
      expect(latest.reading).toEqual({ value: '0501234567', abroad: false });
    });

    it("moves an empty field to the site's country", () => {
      render(<Field sitePhone="+12125550123" />);
      expect(latest.country).toBe('IL');
      act(() => resetPhoneCountriesForTests({ offered: ['IL', 'US'] }));
      expect(latest.country).toBe('US');
      expect(screen.getByTestId('phone-chip-face').textContent).toBe('+1');
    });
  });

  it('offers the country of a value put in from outside even when the API did not name it', () => {
    render(<Field start="(212) 555-0123" />);
    expect(queryChip()).toBeNull();
    act(() => latest.setCountry('US'));
    expect(latest.countries).toEqual(['IL', 'US']);
    expect(chip().getAttribute('aria-label')).toBe('phone.chip phone.country.US 1');
    expect(latest.reading).toEqual({ value: '+12125550123', abroad: true });
  });
});

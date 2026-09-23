import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, InputHTMLAttributes, KeyboardEvent } from 'react';
import { MapPin } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { AddressAnswer, AnswerValue, answerText } from '../../../models/BookingField';
import {
  AddressSession,
  AddressSuggestion,
  fetchAddressSuggestions,
  loadPlaces,
  placesKey,
  resolveAddressSuggestion,
} from '../../../services/places';
import { MaterialInput } from './ScheduleForms';

/**
 * The address question with Google's suggestions under it (LT-191).
 *
 * MaterialInput wrapped as an accessible combobox: the suggestions are a
 * listbox of options, the arrow keys walk it, Enter or a tap chooses. A
 * chosen suggestion becomes an AddressAnswer — the formatted address plus
 * the place id and coordinates — and any further keystroke drops back to
 * a plain string, because the place is no longer vouched for.
 *
 * Degrades, never blocks (the LT-098 lesson): without a key, with the
 * script blocked or slow, or with Google refusing a request, this is the
 * plain input the field always was — quietly, with no message — and the
 * parent hears (onActiveChange) so it stops insisting on a chosen address.
 */

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 3;

/** 'off': no key, nothing is ever loaded. 'failed': the script or a request failed — free text from here on. */
type Status = 'off' | 'loading' | 'ready' | 'failed';

export interface AddressAutocompleteProps {
  /** The owner's words, rendered raw. */
  label: string;
  value: AnswerValue;
  onChange: (value: string | AddressAnswer) => void;
  /** True while suggestions are live, i.e. while a typed address must be chosen from them. */
  onActiveChange?: (active: boolean) => void;
  error?: string;
  required?: boolean;
  hint?: string;
  name: string;
  id: string;
  maxLength?: number;
}

export const AddressAutocomplete = ({
  label,
  value,
  onChange,
  onActiveChange,
  error,
  required,
  hint,
  name,
  id,
  maxLength,
}: AddressAutocompleteProps) => {
  const { t, language } = useLanguage();
  const text = answerText(value);
  const [status, setStatus] = useState<Status>(() => (placesKey() ? 'loading' : 'off'));
  /** What the customer last typed: null until they do, and again once they choose. */
  const [query, setQuery] = useState<string | null>(null);
  /** null: nothing fetched for this query yet. []: Google had no match. */
  const [suggestions, setSuggestions] = useState<AddressSuggestion[] | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const session = useRef<AddressSession>({});
  /** Bumped per request so a slow answer to an old query is dropped. */
  const ticket = useRef(0);
  /** Set on blur, cleared on the next keystroke or focus: a late answer must not open the list under nobody. */
  const blurred = useRef(false);
  const mounted = useRef(true);
  const onActiveRef = useRef(onActiveChange);
  onActiveRef.current = onActiveChange;

  const listId = `${id}-listbox`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const active = status === 'ready';

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Load as soon as the field is on screen: the customer reads the label,
  // taps, types — the script has that long. The field only mounts when an
  // address question is in scope, and 'off' never loads at all.
  useEffect(() => {
    if (status !== 'loading') return;
    let cancelled = false;
    loadPlaces().then(
      () => {
        if (!cancelled) setStatus('ready');
      },
      () => {
        if (!cancelled) setStatus('failed');
      }
    );
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    onActiveRef.current?.(active);
  }, [active]);
  useEffect(
    () => () => {
      onActiveRef.current?.(false);
    },
    []
  );

  // The query, debounced, from the third character; also fires when the
  // script becomes ready with something already typed.
  useEffect(() => {
    if (!active || query === null) return;
    const input = query.trim();
    if (input.length < MIN_QUERY_LENGTH) {
      setSuggestions(null);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    const mine = ++ticket.current;
    const timer = setTimeout(() => {
      fetchAddressSuggestions(input, { language, session: session.current }).then(
        (found) => {
          if (!mounted.current || ticket.current !== mine) return;
          setSuggestions(found);
          setActiveIndex(-1);
          setOpen(!blurred.current);
        },
        () => {
          if (!mounted.current || ticket.current !== mine) return;
          // Google refused or is unreachable: free text from here on, quietly.
          setStatus('failed');
          setSuggestions(null);
          setOpen(false);
        }
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [active, query, language]);

  // Keep the highlighted row in view while the arrow keys walk a long list.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(optionId(activeIndex))?.scrollIntoView?.({ block: 'nearest' });
    // optionId only depends on the id prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex, id]);

  const choose = useCallback(
    async (index: number) => {
      const suggestion = suggestions?.[index];
      if (!suggestion) return;
      ticket.current += 1;
      setOpen(false);
      setActiveIndex(-1);
      setQuery(null);
      // The chosen line at once; the place id and coordinates join it below.
      // The text never changes on them: what the customer read is what is
      // stored, in the language it was listed in (LT-192).
      onChange(suggestion.text);
      try {
        const place = await resolveAddressSuggestion(suggestion);
        if (!mounted.current) return;
        onChange({ text: suggestion.text, placeId: place.placeId, lat: place.lat, lng: place.lng });
      } catch {
        // The place could not be fetched: what they chose stays as text, and
        // the form accepts it rather than demanding a choice it cannot verify.
        if (mounted.current) setStatus('failed');
      } finally {
        // The session ended with the details call; the next keystroke starts another.
        session.current = {};
      }
    },
    [suggestions, onChange]
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const typed = event.target.value;
    blurred.current = false;
    setQuery(typed);
    // A plain string again, even after a choice: the place is no longer vouched for.
    onChange(typed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!active) return;
    const count = suggestions?.length ?? 0;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (count === 0) return;
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        if (!open) {
          setOpen(true);
          setActiveIndex(step === 1 ? 0 : count - 1);
        } else {
          setActiveIndex((current) => (current < 0 ? (step === 1 ? 0 : count - 1) : (current + step + count) % count));
        }
        break;
      }
      case 'Enter':
        if (open && activeIndex >= 0 && activeIndex < count) {
          event.preventDefault();
          void choose(activeIndex);
        }
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          setOpen(false);
          setActiveIndex(-1);
        }
        break;
    }
  };

  const handleFocus = () => {
    blurred.current = false;
    if (suggestions !== null && query !== null) setOpen(true);
  };

  const handleBlur = () => {
    blurred.current = true;
    setOpen(false);
    setActiveIndex(-1);
  };

  const combobox: InputHTMLAttributes<HTMLInputElement> = active
    ? {
        role: 'combobox',
        'aria-autocomplete': 'list',
        'aria-haspopup': 'listbox',
        'aria-expanded': open,
        'aria-controls': open ? listId : undefined,
        'aria-activedescendant': open && activeIndex >= 0 ? optionId(activeIndex) : undefined,
      }
    : {};
  const list = active && open ? suggestions : null;

  return (
    <div className="relative">
      <MaterialInput
        icon={MapPin}
        label={label}
        value={text}
        onChange={handleChange}
        error={error}
        required={required}
        name={name}
        id={id}
        maxLength={maxLength}
        // The browser's own address autofill would sit on top of the list.
        autoComplete={active ? 'off' : 'street-address'}
        hint={hint}
        inputRef={inputRef}
        inputProps={{ ...combobox, onKeyDown: handleKeyDown, onFocus: handleFocus, onBlur: handleBlur }}
      />
      {list && (
        <div
          className="absolute start-0 end-0 top-full z-20 mt-1 overflow-hidden rounded-design-sm border-2 border-primary/30 dark:border-primary-dark/30 bg-light-surface dark:bg-dark-surface shadow-card"
          // Keeps the input focused through a click or a tap on a row.
          onMouseDown={(event) => event.preventDefault()}
        >
          <ul
            id={listId}
            role="listbox"
            aria-label={t('schedule.form.answer.addressSuggestions')}
            className="max-h-64 overflow-y-auto py-1"
          >
            {list.length === 0 ? (
              <li
                role="option"
                aria-selected={false}
                aria-disabled={true}
                className="flex min-h-[44px] items-center px-4 py-2.5 text-sm text-light-text/60 dark:text-dark-text/60"
              >
                {t('schedule.form.answer.noAddresses')}
              </li>
            ) : (
              list.map((suggestion, index) => (
                <li
                  key={suggestion.placeId}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`flex min-h-[44px] cursor-pointer flex-col justify-center px-4 py-2.5 text-start ${
                    index === activeIndex
                      ? 'bg-primary/10 dark:bg-primary-dark/10'
                      : 'hover:bg-light-gray dark:hover:bg-dark-gray'
                  }`}
                  onMouseMove={() => {
                    if (index !== activeIndex) setActiveIndex(index);
                  }}
                  onClick={() => {
                    void choose(index);
                  }}
                >
                  <span className="text-light-text dark:text-dark-text">{suggestion.mainText}</span>
                  {suggestion.secondaryText && (
                    <span className="text-sm text-light-text/60 dark:text-dark-text/60">{suggestion.secondaryText}</span>
                  )}
                </li>
              ))
            )}
          </ul>
          {/* Google's attribution for Places data shown without a map: the
              policy asks for the Google Maps logo, and allows the text
              "Google Maps", unmodified, where space is limited. */}
          <div className="border-t border-primary/15 dark:border-primary-dark/15 px-4 py-1.5 text-end text-xs text-light-text/70 dark:text-dark-text/70">
            Google Maps
          </div>
        </div>
      )}
    </div>
  );
};

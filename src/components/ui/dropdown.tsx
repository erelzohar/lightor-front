import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStill } from '../../hooks/useA11yPrefs';

/**
 * LT-365: the sites' dropdown, the same one as the dashboard's (21st.dev
 * "dropdown": a springy panel, a highlight that slides between rows, a check
 * on the chosen one, typeahead, the listbox keyboard), in the site's own
 * palette and radius. The trigger takes the form field's classes; the panel
 * is portalled to <body> and placed against it (a modal's overflow never
 * clips it, it opens upwards when there is more room above). "Stop
 * animations" in the accessibility menu (LT-346) stills it like the OS
 * setting does.
 */

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

const EASE = [0.23, 1, 0.32, 1] as const;
const EXIT = [0.4, 0, 1, 1] as const;
const CELL = { type: 'spring', stiffness: 520, damping: 34, mass: 0.45 } as const;
const NUDGE = { type: 'spring', stiffness: 700, damping: 46, mass: 0.5 } as const;
const NONE = { duration: 0 } as const;
const SLIDE = { type: 'spring', stiffness: 700, damping: 46, mass: 0.5 } as const;
const OPEN = { type: 'spring', stiffness: 620, damping: 38, mass: 0.6 } as const;

/** Row height in px: the sliding highlight moves by whole rows. */
const ROW_H = 40;
const GAP = 6;
const MARGIN = 12;

export type DropdownItem = {
  value: string;
  label: ReactNode;
  /** The words typeahead matches when `label` is not a string. */
  text?: string;
  hint?: string;
  disabled?: boolean;
};

const textOf = (item: DropdownItem) => item.text ?? (typeof item.label === 'string' ? item.label : '');

export type UseDropdownOptions = {
  items: DropdownItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  typeaheadDelay?: number;
  defaultOpen?: boolean;
};

export function useDropdown({
  items,
  value,
  defaultValue,
  onChange,
  disabled = false,
  typeaheadDelay = 600,
  defaultOpen = false,
}: UseDropdownOptions) {
  const uid = useId();
  const listId = `${uid}-list`;
  const itemId = useCallback((i: number) => `${uid}-opt-${i}`, [uid]);

  const [uncontrolled, setUncontrolled] = useState<string | null>(defaultValue ?? null);
  const selectedValue = value !== undefined ? value : uncontrolled;
  const selectedIndex = items.findIndex((it) => it.value === selectedValue);

  const [open, setOpen] = useState(defaultOpen);
  const [activeIndex, setActiveIndex] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const viaKey = useRef(false);
  const buffer = useRef('');
  const bufferTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emit = useRef(onChange);
  emit.current = onChange;

  const step = useCallback(
    (from: number, dir: 1 | -1) => {
      const n = items.length;
      if (n === 0) return -1;
      let i = from;
      for (let k = 0; k < n; k++) {
        i = (i + dir + n) % n;
        if (!items[i].disabled) return i;
      }
      return from;
    },
    [items],
  );

  const edge = useCallback((dir: 1 | -1) => step(dir === 1 ? -1 : items.length, dir), [step, items.length]);

  const openMenu = useCallback(
    (index?: number) => {
      if (disabled || items.length === 0) return;
      const usable = selectedIndex >= 0 && !items[selectedIndex].disabled;
      viaKey.current = true;
      setActiveIndex(index ?? (usable ? selectedIndex : edge(1)));
      setOpen(true);
    },
    [disabled, items, selectedIndex, edge],
  );

  const close = useCallback((restoreFocus = true) => {
    buffer.current = '';
    setOpen(false);
    setActiveIndex(-1);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const select = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item || item.disabled) return;
      if (value === undefined) setUncontrolled(item.value);
      emit.current?.(item.value);
      close();
    },
    [items, value, close],
  );

  const typeahead = useCallback(
    (char: string) => {
      if (bufferTimer.current) clearTimeout(bufferTimer.current);
      buffer.current += char.toLowerCase();
      bufferTimer.current = setTimeout(() => {
        buffer.current = '';
      }, typeaheadDelay);

      const q = buffer.current;
      const n = items.length;
      const from = activeIndex < 0 ? 0 : activeIndex;
      const start = q.length > 1 ? from : from + 1;
      for (let k = 0; k < n; k++) {
        const i = (start + k) % n;
        const it = items[i];
        if (!it.disabled && textOf(it).toLowerCase().startsWith(q)) {
          viaKey.current = true;
          setActiveIndex(i);
          return;
        }
      }
    },
    [items, activeIndex, typeaheadDelay],
  );

  useEffect(() => {
    if (open) listRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // The panel lives in a portal, outside the root: a tap in either is inside.
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !panelRef.current?.contains(t)) close(false);
    };
    const onWindowBlur = () => close(false);
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open || activeIndex < 0 || !viaKey.current) return;
    viaKey.current = false;
    itemRefs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [open, activeIndex]);

  useEffect(
    () => () => {
      if (bufferTimer.current) clearTimeout(bufferTimer.current);
    },
    [],
  );

  const triggerProps = {
    ref: triggerRef,
    type: 'button' as const,
    disabled,
    'aria-haspopup': 'listbox' as const,
    'aria-expanded': open,
    'aria-controls': open ? listId : undefined,
    onClick: () => (open ? close() : openMenu()),
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        openMenu(edge(-1));
      }
    },
  };

  const listProps = {
    ref: listRef,
    id: listId,
    role: 'listbox' as const,
    tabIndex: -1,
    'aria-activedescendant': activeIndex >= 0 ? itemId(activeIndex) : undefined,
    onKeyDown: (e: React.KeyboardEvent<HTMLUListElement>) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        viaKey.current = true;
        setActiveIndex((i) => step(i, dir));
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        viaKey.current = true;
        setActiveIndex(edge(e.key === 'Home' ? 1 : -1));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select(activeIndex);
      } else if (e.key === 'Escape' || e.key === 'Tab') {
        e.preventDefault();
        close();
      } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        typeahead(e.key);
      }
    },
  };

  const getItemProps = useCallback(
    (index: number) => ({
      id: itemId(index),
      role: 'option' as const,
      'aria-selected': index === selectedIndex,
      'aria-disabled': items[index]?.disabled ? (true as const) : undefined,
      'data-value': items[index]?.value,
      ref: (el: HTMLLIElement | null) => {
        itemRefs.current[index] = el;
      },
      onPointerMove: () => {
        if (items[index]?.disabled) return;
        viaKey.current = false;
        setActiveIndex(index);
      },
      onClick: () => select(index),
    }),
    [itemId, items, selectedIndex, select],
  );

  return {
    open,
    openMenu,
    close,
    select,
    activeIndex,
    selectedIndex,
    selectedItem: selectedIndex >= 0 ? items[selectedIndex] : null,
    itemId,
    rootRef,
    panelRef,
    triggerRef,
    listRef,
    triggerProps,
    listProps,
    getItemProps,
  };
}

type Place = { top?: number; bottom?: number; left?: number; right?: number; width: number; maxHeight: number; up: boolean };

/** Where the panel goes: under the trigger (over it when there is more room
 *  above), from the trigger's start edge, at least as wide as it. */
function placeAgainst(trigger: HTMLElement, minWidth: number): Place {
  const r = trigger.getBoundingClientRect();
  const rtl = getComputedStyle(trigger).direction === 'rtl';
  const below = window.innerHeight - r.bottom - GAP - MARGIN;
  const above = r.top - GAP - MARGIN;
  const up = below < 200 && above > below;
  const width = Math.min(Math.max(r.width, minWidth), window.innerWidth - 2 * MARGIN);
  const x = rtl
    ? { right: Math.max(MARGIN, Math.min(window.innerWidth - r.right, window.innerWidth - MARGIN - width)) }
    : { left: Math.max(MARGIN, Math.min(r.left, window.innerWidth - MARGIN - width)) };
  return {
    ...x,
    ...(up ? { bottom: window.innerHeight - r.top + GAP } : { top: r.bottom + GAP }),
    width,
    maxHeight: Math.max(ROW_H * 3, up ? above : below),
    up,
  };
}

export type DropdownProps = {
  items: DropdownItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** The trigger's id: a <label htmlFor> then names it and opens it. */
  id?: string;
  /** Ids of what names the trigger (the visible label); its value is added. */
  labelledBy?: string;
  describedBy?: string;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Classes for the trigger: the form field's own. */
  className?: string;
  rootClassName?: string;
  minPanelWidth?: number;
};

export const Dropdown = forwardRef<HTMLButtonElement, DropdownProps>(function Dropdown(
  {
    items,
    value,
    defaultValue,
    onChange,
    id,
    labelledBy,
    describedBy,
    ariaLabel,
    placeholder = '',
    disabled = false,
    invalid = false,
    className = '',
    rootClassName = '',
    minPanelWidth = 180,
  }: DropdownProps,
  ref,
) {
  const reduced = useStill();
  const valueId = `${useId()}-value`;
  const { open, activeIndex, selectedIndex, selectedItem, rootRef, panelRef, triggerRef, listRef, triggerProps, listProps, getItemProps } =
    useDropdown({ items, value, defaultValue, onChange, disabled });
  useImperativeHandle(ref, () => triggerRef.current as HTMLButtonElement, [triggerRef]);

  const [place, setPlace] = useState<Place | null>(null);
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => triggerRef.current && setPlace(placeAgainst(triggerRef.current, minPanelWidth));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, triggerRef, minPanelWidth]);

  // The panel mounts once it is placed, a render after `open`: the list
  // takes the focus then.
  const placed = !!place;
  useEffect(() => {
    if (open && placed) listRef.current?.focus({ preventScroll: true });
  }, [open, placed, listRef]);

  const cell = reduced ? NONE : CELL;
  const up = place?.up ?? false;
  const empty = !selectedItem || selectedItem.value === '';

  return (
    <div ref={rootRef} className={cx('relative', rootClassName)}>
      <button
        {...triggerProps}
        id={id}
        aria-labelledby={labelledBy ? `${labelledBy} ${valueId}` : undefined}
        aria-label={labelledBy ? undefined : ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={cx('flex items-center text-start select-none cursor-pointer', className)}
      >
        <span id={valueId} className={cx('min-w-0 flex-1 truncate', empty && 'text-light-text/50 dark:text-dark-text/50')}>
          {selectedItem ? selectedItem.label : placeholder}
        </span>
        <motion.svg
          aria-hidden
          viewBox="0 0 12 12"
          className="ms-2 size-4 shrink-0 text-light-text/60 dark:text-dark-text/60"
          initial={false}
          animate={{ rotate: open ? 180 : 0 }}
          transition={reduced ? NONE : NUDGE}
        >
          <path d="M3 4.75 6 7.75 9 4.75" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>
      {createPortal(
        <AnimatePresence>
          {open && place && (
            <motion.div
              ref={panelRef}
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: up ? 8 : -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: up ? 6 : -6, transition: reduced ? NONE : { duration: 0.12, ease: EXIT } }}
              transition={reduced ? NONE : { ...OPEN, opacity: { duration: 0.12, ease: EASE } }}
              style={{ top: place.top, bottom: place.bottom, left: place.left, right: place.right, width: place.width }}
              className={cx(
                'fixed z-[10100] rounded-design-sm border-2 border-primary/20 dark:border-primary-dark/30 bg-light-surface dark:bg-dark-surface p-1.5',
                'shadow-[0_1px_2px_rgba(0,0,0,0.06),0_16px_36px_-18px_rgba(0,0,0,0.5)]',
                up ? 'origin-bottom' : 'origin-top',
              )}
            >
              <ul
                {...listProps}
                aria-labelledby={labelledBy}
                aria-label={labelledBy ? undefined : ariaLabel}
                style={{ maxHeight: Math.min(place.maxHeight - 16, ROW_H * 7) }}
                className="relative overflow-y-auto overscroll-contain outline-none"
              >
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-10 rounded-md bg-primary/10 dark:bg-primary-dark/15"
                  initial={false}
                  animate={{ y: activeIndex < 0 ? 0 : activeIndex * ROW_H, opacity: activeIndex < 0 ? 0 : 1 }}
                  transition={reduced ? NONE : { ...SLIDE, opacity: { duration: 0.1, ease: EASE } }}
                />
                {items.map((item, i) => {
                  // The empty first row ("Choose an option") gets no check.
                  const picked = i === selectedIndex && item.value !== '';
                  return (
                    <li
                      key={item.value}
                      {...getItemProps(i)}
                      className={cx(
                        'relative flex h-10 cursor-pointer select-none items-center rounded-md px-3',
                        item.disabled ? 'text-light-text/30 dark:text-dark-text/30' : 'text-light-text dark:text-dark-text',
                        item.value === '' && 'text-light-text/60 dark:text-dark-text/60',
                        picked && 'font-medium',
                      )}
                    >
                      <span className="relative min-w-0 flex-1 truncate">{item.label}</span>
                      <motion.span
                        aria-hidden
                        initial={false}
                        animate={{ opacity: picked ? 1 : 0, scale: picked ? 1 : 0.7 }}
                        transition={cell}
                        className="relative ms-2 flex size-4 shrink-0 items-center justify-center text-primary dark:text-primary-dark"
                      >
                        <svg viewBox="0 0 14 14" className="size-4">
                          <path d="M3 7.4 5.8 10.2 11 4.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </motion.span>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
});

export default Dropdown;

import React, { useEffect, useId, useRef, useState } from 'react';
import { Accessibility, Check, Contrast, Link2, Minus, PauseCircle, Plus, RotateCcw, Type, WrapText, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useA11yPrefs } from '../../hooks/useA11yPrefs';
import { getA11yPrefs, isCustomised, resetA11yPrefs, setA11yPrefs, TEXT_SCALE, type A11yPrefs, type TextStep } from '../../services/a11yPrefs';
import { STATEMENT_HASH, onStatementLinkClick } from '../../services/a11yStatement';

interface AccessibilityMenuProps {
  /** The free plan's contact button holds the corner (LT-312): sit above it. */
  aboveContactButton: boolean;
}

type ToggleKey = Exclude<keyof A11yPrefs, 'text'>;

const TOGGLES: { key: ToggleKey; icon: LucideIcon }[] = [
  { key: 'contrast', icon: Contrast },
  { key: 'links', icon: Link2 },
  { key: 'font', icon: Type },
  { key: 'spacing', icon: WrapText },
  { key: 'still', icon: PauseCircle },
];

/**
 * LT-346: the site's accessibility menu — Lightor's own, not a third-party
 * script (LT-339 D1). Every choice is a class on <html> (services/a11yPrefs)
 * plus, for motion, the hooks the animated parts already ask. A preferences
 * panel only: it never claims to make the site compliant and never touches a
 * screen reader. A small round button in the start-side corner opens it.
 */
const AccessibilityMenu: React.FC<AccessibilityMenuProps> = ({ aboveContactButton }) => {
  const { t } = useLanguage();
  const prefs = useA11yPrefs();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();
  useDialogFocus(open, panelRef, () => setOpen(false), { trap: false });

  // A click elsewhere closes it, as any popover.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // From the store, not this render: two quick taps are two steps.
  const step = (d: 1 | -1) => setA11yPrefs({ text: Math.min(3, Math.max(0, getA11yPrefs().text + d)) as TextStep });

  return (
    <div ref={wrapRef} className={`fixed start-4 z-50 ${aboveContactButton ? 'bottom-[4.75rem]' : 'bottom-4'}`} data-lt-a11y-menu="">
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="lt-ui absolute bottom-14 start-0 w-[min(20rem,calc(100vw-2rem))] max-h-[70svh] overflow-y-auto overflow-x-hidden rounded-2xl bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text shadow-2xl border border-light-text/10 dark:border-dark-text/15 p-4 text-start"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 id={titleId} className="min-w-0 break-words font-bold">{t('a11y.menu.title')}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('a11y.menu.close')}
              className="p-2 -m-1 rounded-full hover:bg-light-gray dark:hover:bg-dark-gray"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl bg-light-gray/40 dark:bg-dark-gray/20 p-2 mb-3" role="group" aria-label={t('a11y.menu.text')}>
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={prefs.text === 0}
              aria-label={t('a11y.menu.textSmaller')}
              className="p-2 rounded-lg bg-light-surface dark:bg-dark-surface disabled:opacity-40"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="text-sm font-medium" aria-live="polite">
              {t('a11y.menu.text')} <bdi>{TEXT_SCALE[prefs.text]}%</bdi>
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              disabled={prefs.text === 3}
              aria-label={t('a11y.menu.textLarger')}
              className="p-2 rounded-lg bg-light-surface dark:bg-dark-surface disabled:opacity-40"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {TOGGLES.map(({ key, icon: Icon }) => {
              const on = prefs[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setA11yPrefs({ [key]: !on } as Partial<A11yPrefs>)}
                  className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-3 text-sm font-medium leading-tight ${on
                    ? 'border-primary dark:border-primary-dark bg-primary/10 dark:bg-primary-dark/15'
                    : 'border-transparent bg-light-gray/40 dark:bg-dark-gray/20'}`}
                >
                  {on && <Check className="absolute top-1.5 end-1.5 h-4 w-4 text-primary-readable dark:text-primary-dark-readable" aria-hidden="true" />}
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{t(`a11y.menu.${key}`)}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={resetA11yPrefs}
              disabled={!isCustomised(prefs)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-transparent bg-light-gray/40 dark:bg-dark-gray/20 px-2 py-3 text-sm font-medium leading-tight disabled:opacity-40"
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              <span>{t('a11y.menu.reset')}</span>
            </button>
          </div>

          <a
            href={STATEMENT_HASH}
            onClick={(e) => { onStatementLinkClick(e); setOpen(false); }}
            className="block text-center text-sm underline underline-offset-2 text-primary-readable dark:text-primary-dark-readable py-1"
          >
            {t('a11y.menu.statement')}
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('a11y.menu.button')}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="h-12 w-12 flex items-center justify-center rounded-full shadow-lg bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark"
      >
        <Accessibility className="h-7 w-7" aria-hidden="true" />
      </button>
    </div>
  );
};

export default AccessibilityMenu;

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useRef, useState } from 'react';
import AccessibilityMenu from '../../components/a11y/AccessibilityMenu';
import AccessibilityStatement from '../../components/a11y/AccessibilityStatement';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import {
  DEFAULT_PREFS, getA11yPrefs, reloadA11yPrefs, resetA11yPrefs, setA11yMenuEnabled, setA11yPrefs,
} from '../../services/a11yPrefs';
import { closeStatement, isStatementOpen, openStatement } from '../../services/a11yStatement';
import { reducedMotion } from '../../services/generateReveal';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string>) => (params ? `${key} ${Object.values(params).join(' ')}` : key),
    language: 'he',
  }),
}));

const html = document.documentElement;

beforeEach(() => {
  localStorage.clear();
  reloadA11yPrefs();
  act(() => closeStatement());
});

/** LT-346 — the visitor's choices, kept per site and applied as <html> classes. */
describe('accessibility preferences', () => {
  it('turns each choice into a class on <html> and remembers it', () => {
    setA11yPrefs({ text: 2, contrast: true, still: true });
    expect(html.classList.contains('a11y-text-2')).toBe(true);
    expect(html.classList.contains('a11y-contrast')).toBe(true);
    expect(html.classList.contains('a11y-still')).toBe(true);
    expect(JSON.parse(localStorage.getItem('lt-a11y')!)).toMatchObject({ text: 2, contrast: true, still: true });

    reloadA11yPrefs();
    expect(getA11yPrefs()).toMatchObject({ text: 2, contrast: true, still: true });

    resetA11yPrefs();
    expect(localStorage.getItem('lt-a11y')).toBeNull();
    expect([...html.classList].filter((c) => c.startsWith('a11y-'))).toEqual([]);
  });

  it('shrugs off a damaged or hand-edited stored value', () => {
    localStorage.setItem('lt-a11y', '{not json');
    reloadA11yPrefs();
    expect(getA11yPrefs()).toEqual(DEFAULT_PREFS);
    localStorage.setItem('lt-a11y', JSON.stringify({ text: 9, contrast: 'yes', links: true }));
    reloadA11yPrefs();
    expect(getA11yPrefs()).toEqual({ ...DEFAULT_PREFS, links: true });
  });

  it('applies nothing on a site whose owner hid the menu — there is no way to undo it there', () => {
    setA11yPrefs({ text: 3, still: true });
    setA11yMenuEnabled(false);
    expect(html.classList.contains('a11y-text-3')).toBe(false);
    expect(reducedMotion()).toBe(false);
    setA11yMenuEnabled(true);
    expect(html.classList.contains('a11y-text-3')).toBe(true);
    expect(reducedMotion()).toBe(true);
  });

  it('"stop animations" counts as reduced motion for the animated parts', () => {
    expect(reducedMotion()).toBe(false);
    setA11yPrefs({ still: true });
    expect(reducedMotion()).toBe(true);
  });
});

describe('the accessibility menu', () => {
  it('opens a labelled panel, toggles choices, and Escape closes it back onto its button', () => {
    render(<AccessibilityMenu aboveContactButton={false} />);
    const button = screen.getByRole('button', { name: 'a11y.menu.button' });
    button.focus();
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'a11y.menu.title' })).toBeInTheDocument();

    const contrast = screen.getByRole('button', { name: 'a11y.menu.contrast' });
    expect(contrast).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(contrast);
    expect(contrast).toHaveAttribute('aria-pressed', 'true');
    expect(html.classList.contains('a11y-contrast')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'a11y.menu.textLarger' }));
    expect(getA11yPrefs().text).toBe(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('sits above the free plan\'s contact button, in the corner otherwise', () => {
    const { container, rerender } = render(<AccessibilityMenu aboveContactButton />);
    expect(container.firstElementChild?.className).toContain('bottom-[4.75rem]');
    rerender(<AccessibilityMenu aboveContactButton={false} />);
    expect(container.firstElementChild?.className).toContain('bottom-4');
  });

  it('links to the statement', () => {
    render(<><AccessibilityMenu aboveContactButton={false} /><AccessibilityStatement businessName="Studio" bookable /></>);
    fireEvent.click(screen.getByRole('button', { name: 'a11y.menu.button' }));
    fireEvent.click(screen.getByRole('link', { name: 'a11y.menu.statement' }));
    expect(isStatementOpen()).toBe(true);
    expect(screen.getByRole('dialog', { name: 'a11y.statement.title' })).toBeInTheDocument();
  });
});

describe('the accessibility statement', () => {
  it('names the business and gives EZ Webs as the contact, with the business phone as another way to book', () => {
    render(<AccessibilityStatement businessName="Studio Noa" phone="050-1234567" bookable />);
    act(() => openStatement());
    const dialog = screen.getByRole('dialog', { name: 'a11y.statement.title' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.textContent).toContain('Studio Noa');
    expect(screen.getByRole('link', { name: 'ezwebsisr@gmail.com' })).toHaveAttribute('href', 'mailto:ezwebsisr@gmail.com');
    expect(dialog.textContent).toContain('a11y.statement.contact EZ\u00a0Webs');
    expect(screen.getByRole('link', { name: '050-1234567' })).toHaveAttribute('href', 'tel:0501234567');
  });

  it('a leads site offers contact, not booking, by phone', () => {
    render(<AccessibilityStatement businessName="Studio" phone="050-1234567" bookable={false} />);
    act(() => openStatement());
    expect(screen.getByRole('dialog').textContent).toContain('a11y.statement.phoneLead');
    expect(screen.getByRole('dialog').textContent).toContain('a11y.statement.contactLead');
  });

  it('opens from /#accessibility and closes on Escape', () => {
    window.history.replaceState(null, '', '/#accessibility');
    render(<AccessibilityStatement businessName="Studio" bookable />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.location.hash).toBe('');
  });
});

function Harness() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(open, ref, () => setOpen(false));
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>open</button>
      {open && (
        <div ref={ref} role="dialog" tabIndex={-1}>
          <button type="button">first</button>
          <button type="button">last</button>
        </div>
      )}
    </>
  );
}

describe('useDialogFocus', () => {
  it('moves focus in, keeps Tab inside, and returns focus on close', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'open' });
    opener.focus();
    fireEvent.click(opener);
    const first = screen.getByRole('button', { name: 'first' });
    const last = screen.getByRole('button', { name: 'last' });
    expect(document.activeElement).toBe(first);
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});

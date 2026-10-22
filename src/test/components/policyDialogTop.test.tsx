import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { LegalModal } from '../../components/LegalModal';
import AccessibilityStatement from '../../components/a11y/AccessibilityStatement';
import { closeStatement, isStatementOpen, openStatement } from '../../services/a11yStatement';

/**
 * LT-446: in a policy, and in the accessibility statement, the title and the
 * X stay on top while the text scrolls - the X used to scroll away with it.
 * So the scrolling box is the text alone, below the title and the button,
 * and the button is a filled 40px circle.
 */

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string>) => (params ? `${key} ${Object.values(params).join(' ')}` : key),
    language: 'he',
  }),
}));

const expectFixedTop = () => {
  const dialog = screen.getByRole('dialog');
  const top = within(dialog).getByTestId('dialog-top');
  const text = within(dialog).getByTestId('dialog-text');
  const close = within(top).getByRole('button', { name: 'a11y.menu.close' });
  // The dialog itself does not scroll; the text does, and holds neither the title nor the X.
  expect(dialog.className).toContain('overflow-hidden');
  expect(dialog.className).toContain('flex-col');
  expect(text.className).toContain('overflow-y-auto');
  expect(text.contains(close)).toBe(false);
  expect(text.contains(within(top).getByRole('heading'))).toBe(false);
  expect(top.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // A button you can see, and the keyboard can scroll the text.
  expect(close.className).toMatch(/h-10 w-10/);
  expect(close.className).toMatch(/rounded-full/);
  expect(close.className).toMatch(/\bbg-/);
  expect(text).toHaveAttribute('tabindex', '0');
  return close;
};

describe('the policies keep their title and X on top (LT-446)', () => {
  beforeEach(() => act(() => closeStatement()));

  it('a policy (privacy, terms, security)', () => {
    const onClose = vi.fn();
    render(<LegalModal isOpen onClose={onClose} title="Terms of Use" content={<p>Long text</p>} />);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Terms of Use');
    fireEvent.click(expectFixedTop());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('the accessibility statement', () => {
    render(<AccessibilityStatement businessName="Studio" bookable />);
    act(() => openStatement());
    expect(screen.getByRole('dialog')).toHaveAccessibleName('a11y.statement.title');
    fireEvent.click(expectFixedTop());
    expect(isStatementOpen()).toBe(false);
  });
});

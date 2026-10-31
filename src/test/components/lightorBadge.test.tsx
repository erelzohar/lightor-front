import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LightorBadge from '../../components/LightorBadge';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

/**
 * LT-503 (Erel 2026-10-31): the free plan's badge floats at the bottom of the
 * screen all the way down, under the menus and windows, and the page's end
 * keeps room for it so the last line stays readable.
 */
describe('LightorBadge', () => {
  const badge = () => screen.queryByRole('link', { name: 'badge.builtWith' });

  it('floats on the free plan, below the z-50 windows, and only the link takes clicks', () => {
    render(<LightorBadge />);
    const holder = badge()!.parentElement!;
    expect(badge()).toHaveAttribute('href', 'https://register.lightor.app?ref=badge');
    expect(holder).toHaveClass('fixed', 'bottom-4', 'z-40', 'pointer-events-none');
    expect(badge()).toHaveClass('pointer-events-auto');
  });

  it("keeps a strip at the page's end for the badge to land on", () => {
    render(<LightorBadge />);
    expect(badge()!.parentElement!.previousElementSibling).toHaveClass('pb-16');
  });

  it('puts the statement link in the strip, above the badge, on a page without a footer', () => {
    render(<LightorBadge statementLink />);
    const strip = badge()!.parentElement!.previousElementSibling!;
    expect(strip).toHaveTextContent('a11y.menu.statement');
    expect(strip).toHaveClass('pt-3', 'pb-16');
  });

  it('shows no badge on a paid site: the statement link alone, or nothing', () => {
    const { rerender, container } = render(<LightorBadge badge={false} statementLink />);
    expect(badge()).toBeNull();
    expect(container.querySelector('.fixed')).toBeNull();
    expect(screen.getByRole('link', { name: 'a11y.menu.statement' }).parentElement).toHaveClass('pb-3');
    rerender(<LightorBadge badge={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});

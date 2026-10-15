import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import IntroPopup, { INTRO_POPUP_DELAY_MS } from '../../components/IntroPopup';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'he' }),
}));

/**
 * LT-346 — the owner's message appears five seconds after the page opens
 * (Erel), is a real dialog, and stays until the visitor closes it (it used to
 * vanish after five seconds, too soon to read).
 */
describe('the intro popup', () => {
  afterEach(() => vi.useRealTimers());

  // (Closing is useDialogFocus's, tested in accessibility.test; framer's exit
  // animation never finishes in jsdom, so the box lingers here.)
  it('appears after five seconds and stays until closed', () => {
    vi.useFakeTimers();
    render(<IntroPopup config={{ visible: true, value: 'Closed on Sunday' }} />);

    act(() => { vi.advanceTimersByTime(INTRO_POPUP_DELAY_MS - 100); });
    expect(screen.queryByRole('dialog')).toBeNull();

    act(() => { vi.advanceTimersByTime(100); });
    expect(screen.getByRole('dialog', { name: 'intro.title' })).toHaveTextContent('Closed on Sunday');
    expect(INTRO_POPUP_DELAY_MS).toBe(5000);

    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

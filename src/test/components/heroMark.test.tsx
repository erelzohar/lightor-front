import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ComposedPage from '../../components/blocks/ComposedPage';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { getSiteJitter } from '../../services/seed';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
vi.stubGlobal('IntersectionObserver', NoopObserver);
Element.prototype.scrollIntoView = vi.fn();

vi.mock('@marsidev/react-turnstile', () => ({ Turnstile: () => null }));
vi.mock('../../services/AuthService', () => ({ default: { handshake: vi.fn().mockResolvedValue(true) } }));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'he' }),
}));

/**
 * LT-496: the heritage hero (centered, decor 'monogram') used to set the
 * title's first letter in a bordered box; Erel did not like the letter. The
 * site's logo stands in that frame now; with none, or one that fails to
 * load, a ruled ornament. Never a letter.
 */
const renderHero = (logoImageName: string) => {
  const config = WebsiteConfig.fromJSON({
    ...RAW_AI_RESPONSE_SHAPE,
    logoImageName,
    components: { ...RAW_AI_RESPONSE_SHAPE.components, hero: { ...RAW_AI_RESPONSE_SHAPE.components.hero, title: 'ייצוג וליווי משפטי' } },
    design: { ...RAW_AI_RESPONSE_SHAPE.design, heroLayout: 'centered', decor: 'monogram' },
    blocks: [{ type: 'hero' }],
  });
  return render(<ComposedPage config={config} jitter={getSiteJitter('mark-test')} isPreview={false} />);
};

describe('the heritage hero mark (LT-496)', () => {
  it("shows the site's logo in the frame, not the title's first letter", () => {
    renderHero('https://img.test/logo.png');
    const mark = screen.getByTestId('hero-mark');
    expect(mark.querySelector('img')?.getAttribute('src')).toBe('https://img.test/logo.png');
    expect(mark.textContent).toBe('');
    expect(screen.queryByTestId('hero-ornament')).toBeNull();
  });

  it('shows the ruled ornament when there is no logo', () => {
    renderHero('');
    expect(screen.queryByTestId('hero-mark')).toBeNull();
    const ornament = screen.getByTestId('hero-ornament');
    expect(ornament.textContent).toBe('');
    expect(ornament).toHaveAttribute('aria-hidden', 'true');
  });

  it('falls back to the ornament when the logo fails to load', () => {
    renderHero('https://img.test/broken.png');
    fireEvent.error(screen.getByTestId('hero-mark').querySelector('img')!);
    expect(screen.queryByTestId('hero-mark')).toBeNull();
    expect(screen.getByTestId('hero-ornament')).toBeInTheDocument();
  });
});

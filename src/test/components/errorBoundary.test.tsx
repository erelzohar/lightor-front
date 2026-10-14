import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../../components/ErrorBoundary';

vi.mock('../../services/ErrorReportingService', () => ({
  reportClientError: vi.fn().mockResolvedValue(true),
}));

const lang = vi.hoisted(() => ({ current: 'en' as string }));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: lang.current, t: (key: string) => key }),
}));

const Thrower = (): never => {
  throw new TypeError('section exploded');
};

/**
 * A section's boundary (LT-315, review M3): its fallback had English and
 * Hebrew only, so on an Arabic, French or Spanish site the fallback itself
 * threw — and the error climbed to the root, blanking the whole page.
 */
describe('section ErrorBoundary', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it.each([
    ['ar', 'حدث خطأ ما...'],
    ['fr', 'Une erreur est survenue...'],
    ['es', 'Algo salió mal...'],
    ['he', 'משהו השתבש...'],
    ['en', 'Something went wrong...'],
  ])('keeps the failure inside the section on a %s site', (language, title) => {
    lang.current = language;
    render(
      <div>
        <p>the rest of the page</p>
        <ErrorBoundary><Thrower /></ErrorBoundary>
      </div>
    );
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText('the rest of the page')).toBeInTheDocument();
  });

  it('falls back to English for a language it has no strings for', () => {
    lang.current = 'de';
    render(<ErrorBoundary><Thrower /></ErrorBoundary>);
    expect(screen.getByText('Something went wrong...')).toBeInTheDocument();
  });
});

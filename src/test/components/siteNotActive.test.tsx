import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SiteNotActive from '../../components/SiteNotActive';
import { classifyConfigFailure } from '../../services/configFailure';

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'he' }),
}));

/**
 * LT-200 — an owner who has not confirmed their email yet opens their new
 * site: the API answers 403. That is an expected state with its own page,
 * not a crash to report and not "this page does not exist".
 */
describe('a site that is not live yet (LT-200)', () => {
  it('a 403 is "inactive", a 404 is "not found", anything else is an error to report', () => {
    expect(classifyConfigFailure({ response: { status: 403 } })).toBe('inactive');
    expect(classifyConfigFailure({ status: 403 })).toBe('inactive');
    expect(classifyConfigFailure({ response: { status: 404 } })).toBe('not-found');
    expect(classifyConfigFailure({ response: { status: 500 } })).toBe('error');
    expect(classifyConfigFailure(new Error('Network Error'))).toBe('error');
    expect(classifyConfigFailure(undefined)).toBe('error');
  });

  it('tells the owner what is missing and where to fix it', () => {
    render(<SiteNotActive />);
    expect(screen.getByRole('heading', { name: 'inactive.title' })).toBeTruthy();
    expect(screen.getByText('inactive.message')).toBeTruthy();
    expect(screen.getByText('inactive.owner')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'inactive.button' })).toHaveAttribute('href', 'https://dashboard.lightor.app');
  });
});

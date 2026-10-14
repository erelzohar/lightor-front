import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Suspense, type ComponentType } from 'react';
import SiteLighty from '../../components/SiteLighty/SiteLighty';
import ErrorBoundary from '../../components/ErrorBoundary';
import { lazyOptional } from '../../utils/lazyOptional';
import { resetVisitorPassForTests } from '../../services/visitorPass';

/**
 * Review M5 (LT-315): the 3D Lighty's chunk can fail to load — a tab opened
 * before a deploy asks for a file the deploy removed. That used to throw into
 * the section's boundary and replace Lighty, his chat and its call and
 * WhatsApp buttons with "Something went wrong".
 */

vi.mock('../../services/SiteAssistantService', () => ({ default: { ask: vi.fn(), report: vi.fn() } }));
vi.mock('../../services/AuthService', () => ({ default: { handshake: vi.fn().mockResolvedValue(true) } }));
vi.mock('../../services/ErrorReportingService', () => ({ reportClientError: vi.fn().mockResolvedValue(true) }));
// The chunk is gone: importing it fails, as a 404 for an old hash does.
vi.mock('../../components/SiteLighty/SiteLighty3D', () => {
  throw new Error('Failed to fetch dynamically imported module: /assets/SiteLighty3D-old.js');
});
vi.mock('@marsidev/react-turnstile', () => ({ Turnstile: (): null => null }));
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

describe('a 3D chunk that fails to load', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    resetVisitorPassForTests();
    sessionStorage.clear();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('renders nothing in its place instead of throwing', async () => {
    const Missing = lazyOptional(async (): Promise<{ default: ComponentType<object> }> => {
      throw new Error('chunk 404');
    });
    render(
      <ErrorBoundary>
        <p>before</p>
        <Suspense fallback={<p>loading</p>}><Missing /></Suspense>
      </ErrorBoundary>
    );
    await act(async () => { await Promise.resolve(); });
    expect(await screen.findByText('before')).toBeInTheDocument();
    expect(screen.queryByText('loading')).toBeNull();
    expect(screen.queryByText(/Something went wrong/)).toBeNull();
  });

  it('keeps Lighty, his picture and the chat header call and WhatsApp buttons', async () => {
    render(
      <ErrorBoundary>
        <SiteLighty businessName="Dana Studio" leadsSite={false} phone="0501234567" />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByLabelText('assistant.open'));
    // Let the failed import settle.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(screen.queryByText(/Something went wrong/)).toBeNull();
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('img[src="/lighty-support.webp"]')).toBeTruthy();

    const whatsApp = screen.getByLabelText('contact.option.whatsapp');
    const call = screen.getByLabelText('contact.option.call');
    expect(call).toBeEnabled();
    // On a desktop the contact modal opens with the business's number.
    fireEvent.click(whatsApp);
    await screen.findByText('contact.modal.or_whatsapp');
    expect(document.querySelector('a[href="https://wa.me/972501234567"]')).toBeTruthy();
  });
});

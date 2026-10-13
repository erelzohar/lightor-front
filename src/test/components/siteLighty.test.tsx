import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SiteLighty from '../../components/SiteLighty/SiteLighty';
import { replyParts } from '../../components/SiteLighty/replyText';
import { WebsiteConfig } from '../../models/WebsiteConfig';
import { resetVisitorPassForTests } from '../../services/visitorPass';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

/**
 * LT-302 — Lighty, the site's assistant: a visitor's question goes out with
 * the page's visitor pass and the conversation so far; the reply's section
 * links scroll the page; an expired pass is asked for again once; a problem
 * report reaches the server with the page it was sent from.
 */

const mocks = vi.hoisted(() => ({
  ask: vi.fn(),
  report: vi.fn(),
  handshake: vi.fn(),
  scrollToSection: vi.fn(),
}));

vi.mock('../../services/SiteAssistantService', () => ({ default: { ask: mocks.ask, report: mocks.report } }));
vi.mock('../../services/AuthService', () => ({ default: { handshake: mocks.handshake } }));
vi.mock('../../components/SiteLighty/SiteLighty3D', () => ({ default: (): null => null }));
vi.mock('../../utils/sections', () => ({
  sectionOf: (hash: string) => document.querySelector(hash),
  scrollToSection: mocks.scrollToSection,
}));
// The visitor check passes as soon as the widget mounts, as in the lead form's tests.
vi.mock('@marsidev/react-turnstile', async () => {
  const React = await import('react');
  return {
    Turnstile: ({ onSuccess }: { onSuccess?: (token: string) => void }): null => {
      React.useEffect(() => { onSuccess?.('test-token'); }, []);
      return null;
    },
  };
});
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

const openChat = () => fireEvent.click(screen.getByLabelText('assistant.open'));
const ask = (text: string) => {
  fireEvent.change(screen.getByLabelText('assistant.placeholder'), { target: { value: text } });
  fireEvent.click(screen.getByLabelText('assistant.send'));
};

describe('site assistant (LT-302)', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
    mocks.handshake.mockResolvedValue(true);
    resetVisitorPassForTests();
    sessionStorage.clear();
  });

  it('greets with the business name and suggests what a booking site is asked', () => {
    render(<SiteLighty businessName="Dana Studio" leadsSite={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    openChat();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('assistant.hello')).toBeTruthy();
    expect(screen.getByText('assistant.suggest.book')).toBeTruthy();
    expect(screen.queryByText('assistant.suggest.contact')).toBeNull();
  });

  it('suggests the contact form on a leads site', () => {
    render(<SiteLighty businessName="Dana Studio" leadsSite />);
    openChat();
    expect(screen.getByText('assistant.suggest.contact')).toBeTruthy();
    expect(screen.queryByText('assistant.suggest.book')).toBeNull();
  });

  it('asks with a visitor pass and the conversation so far, and its links scroll the page', async () => {
    const schedule = document.createElement('section');
    schedule.id = 'schedule';
    document.body.appendChild(schedule);
    mocks.ask
      .mockResolvedValueOnce({ ok: true, reply: 'A haircut is **₪80**. [Book here](#schedule)' })
      .mockResolvedValueOnce({ ok: true, reply: 'Sunday to Thursday.' });
    render(<SiteLighty businessName="Dana Studio" leadsSite={false} />);
    openChat();
    ask('How much is a haircut?');

    await screen.findByText('₪80');
    expect(mocks.handshake).toHaveBeenCalledWith('test-token');
    expect(mocks.ask).toHaveBeenCalledWith('localhost', 'How much is a haircut?', [], 'en');
    fireEvent.click(screen.getByRole('button', { name: 'Book here' }));
    expect(mocks.scrollToSection).toHaveBeenCalledWith(schedule);

    ask('When are you open?');
    await screen.findByText('Sunday to Thursday.');
    expect(mocks.ask).toHaveBeenLastCalledWith('localhost', 'When are you open?', [
      { role: 'user', text: 'How much is a haircut?' },
      { role: 'assistant', text: 'A haircut is **₪80**. [Book here](#schedule)' },
    ], 'en');
    expect(mocks.handshake).toHaveBeenCalledTimes(1);
    schedule.remove();
  });

  it('asks for a new pass once when the server refuses an expired one', async () => {
    mocks.ask
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, reply: 'We open at nine.' });
    render(<SiteLighty businessName="Dana Studio" leadsSite={false} />);
    openChat();
    ask('Hours?');
    await screen.findByText('We open at nine.');
    expect(mocks.ask).toHaveBeenCalledTimes(2);
    expect(mocks.handshake).toHaveBeenCalledTimes(2);
  });

  it('says Lighty is resting when the site is over its limits', async () => {
    mocks.ask.mockResolvedValue({ ok: false, status: 429 });
    render(<SiteLighty businessName="Dana Studio" leadsSite={false} />);
    openChat();
    fireEvent.click(screen.getByText('assistant.suggest.prices'));
    expect((await screen.findByRole('alert')).textContent).toBe('assistant.error.resting');
    expect(mocks.ask).toHaveBeenCalledWith('localhost', 'assistant.suggest.prices', [], 'en');
  });

  it('sends a problem report with the page it came from, and thanks the visitor', async () => {
    mocks.report.mockResolvedValue({ ok: true });
    render(<SiteLighty businessName="Dana Studio" leadsSite={false} />);
    openChat();
    fireEvent.click(screen.getByText('assistant.report.open'));
    const send = screen.getByText('assistant.report.send').closest('button') as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText('assistant.report.message'), { target: { value: 'hi' } });
    expect(send.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('assistant.report.message'), { target: { value: 'The booking button does nothing' } });
    fireEvent.change(screen.getByLabelText('assistant.report.contact'), { target: { value: '050-1234567' } });
    fireEvent.click(send);

    await screen.findByText('assistant.report.thanks');
    expect(mocks.report).toHaveBeenCalledWith('localhost', {
      message: 'The booking button does nothing',
      contact: '050-1234567',
      pageUrl: window.location.href,
      language: 'en',
    });
  });

  it('tells a visitor over the daily report limit to try tomorrow', async () => {
    mocks.report.mockResolvedValue({ ok: false, status: 429 });
    render(<SiteLighty businessName="Dana Studio" leadsSite={false} />);
    openChat();
    fireEvent.click(screen.getByText('assistant.report.open'));
    fireEvent.change(screen.getByLabelText('assistant.report.message'), { target: { value: 'The page is blank' } });
    fireEvent.click(screen.getByText('assistant.report.send'));
    expect((await screen.findByRole('alert')).textContent).toBe('assistant.report.limit');
    expect(mocks.report.mock.calls[0][1]).not.toHaveProperty('contact');
  });

  it('closes on Escape', async () => {
    render(<SiteLighty businessName="Dana Studio" leadsSite={false} />);
    openChat();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByLabelText('assistant.open')).toBeTruthy();
  });
});

describe('the reply as drawn (LT-302)', () => {
  it('keeps bold and section links and turns any other link into its words', () => {
    expect(replyParts('Open **daily**. [Book](#schedule) or [us](#evil) [x](https://e.com)')).toEqual([
      { kind: 'text', text: 'Open ' },
      { kind: 'bold', text: 'daily' },
      { kind: 'text', text: '. ' },
      { kind: 'link', text: 'Book', section: 'schedule' },
      { kind: 'text', text: ' or ' },
      { kind: 'text', text: 'us' },
      { kind: 'text', text: ' [x](https://e.com)' },
    ]);
  });
});

describe('the assistant flag (LT-302)', () => {
  it('is on only when the server says so', () => {
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, assistant: true }).assistant).toBe(true);
    expect(WebsiteConfig.fromJSON({ ...RAW_AI_RESPONSE_SHAPE, assistant: 'yes' }).assistant).toBe(false);
    expect(WebsiteConfig.fromJSON(RAW_AI_RESPONSE_SHAPE).assistant).toBe(false);
  });
});

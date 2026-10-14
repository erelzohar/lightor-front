import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SiteLighty from '../../components/SiteLighty/SiteLighty';
import { replyParts } from '../../components/SiteLighty/replyText';
import { clampOffset, readOffset, saveOffset } from '../../components/SiteLighty/floating';
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
vi.mock('../../components/SiteLighty/SiteLighty3D', () => ({
  default: ({ dragging, greet }: { dragging?: boolean; greet?: boolean }) => (
    <div data-testid={greet ? 'chat-3d' : 'button-3d'} data-dragging={String(!!dragging)} />
  ),
}));
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

/** LT-312: on a Plus site Lighty is the corner itself — dragged anywhere, a tantrum while held. */
describe('the corner Lighty, dragged (LT-312)', () => {
  const VW = 1000, VH = 800;
  const HOME = { left: VW - 12 - 80, top: VH - 12 - 96, width: 80, height: 96 };
  const realRect = Element.prototype.getBoundingClientRect;
  beforeAll(() => {
    // jsdom has no PointerEvent; a MouseEvent with a pointerId stands in.
    if (!('PointerEvent' in window)) {
      class PE extends MouseEvent {
        pointerId: number;
        pointerType: string;
        constructor(type: string, init: MouseEventInit & { pointerId?: number; pointerType?: string } = {}) {
          super(type, init);
          this.pointerId = init.pointerId ?? 1;
          this.pointerType = init.pointerType ?? '';
        }
      }
      (window as unknown as { PointerEvent: typeof PE }).PointerEvent = PE;
    }
    // His box: the home corner, moved by whatever translate he carries.
    Element.prototype.getBoundingClientRect = function (this: Element) {
      if ((this as HTMLElement).dataset?.testid !== 'site-lighty') return realRect.call(this);
      const m = /translate\((-?\d+)px, (-?\d+)px\)/.exec((this as HTMLElement).style.transform);
      const x = m ? +m[1] : 0, y = m ? +m[2] : 0;
      return { left: HOME.left + x, top: HOME.top + y, right: HOME.left + x + 80, bottom: HOME.top + y + 96, width: 80, height: 96, x: HOME.left + x, y: HOME.top + y, toJSON: () => ({}) } as DOMRect;
    };
  });
  afterAll(() => { Element.prototype.getBoundingClientRect = realRect; });
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: VW, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: VH, configurable: true });
    localStorage.clear();
    sessionStorage.clear();
    Object.values(mocks).forEach((fn) => fn.mockReset());
  });

  const lighty = () => screen.getByLabelText('assistant.open');
  const wrap = () => screen.getByTestId('site-lighty');
  const pointer = (type: 'pointerDown' | 'pointerMove' | 'pointerUp', x: number, y: number) =>
    act(() => { fireEvent[type](lighty(), { pointerId: 1, button: 0, clientX: x, clientY: y }); });

  it('keeps him whole on screen, never below his corner, and remembers where he was left', () => {
    expect(clampOffset(HOME, -5000, -5000, VW, VH)).toEqual({ x: 8 - HOME.left, y: 8 - HOME.top });
    expect(clampOffset(HOME, 500, 500, VW, VH)).toEqual({ x: VW - 80 - 8 - HOME.left, y: 0 });
    expect(readOffset()).toEqual({ x: 0, y: 0 });
    saveOffset({ x: -300, y: -120 });
    expect(readOffset()).toEqual({ x: -300, y: -120 });
    localStorage.setItem('lighty.siteOffset', '{"x":"nope"}');
    expect(readOffset()).toEqual({ x: 0, y: 0 });
  });

  it('a tap still opens the chat', () => {
    render(<SiteLighty businessName="Dana Studio" leadsSite={false} />);
    pointer('pointerDown', 930, 740);
    pointer('pointerMove', 932, 741);
    pointer('pointerUp', 932, 741);
    fireEvent.click(lighty());
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(wrap().style.transform).toBe('');
  });

  it('follows the pointer, throws a tantrum while held, and stays where he is put down', () => {
    render(<SiteLighty businessName="Dana Studio" leadsSite={false} />);
    pointer('pointerDown', 930, 740);
    expect(screen.getByTestId('button-3d')).toHaveAttribute('data-dragging', 'false');
    pointer('pointerMove', 700, 500);
    expect(screen.getByTestId('button-3d')).toHaveAttribute('data-dragging', 'true');
    expect(wrap().style.transform).toBe('translate(-230px, -240px)');
    pointer('pointerMove', -400, 900);
    expect(wrap().style.transform).toBe(`translate(${8 - HOME.left}px, 0px)`);
    pointer('pointerUp', -400, 900);
    expect(screen.getByTestId('button-3d')).toHaveAttribute('data-dragging', 'false');
    expect(readOffset()).toEqual({ x: 8 - HOME.left, y: 0 });
    // The click that ends a drag is the drop, not a tap.
    fireEvent.click(lighty());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a tap after a touch drag (which fires no click) still opens the chat', async () => {
    render(<SiteLighty businessName="Dana Studio" leadsSite={false} />);
    pointer('pointerDown', 930, 740);
    pointer('pointerMove', 700, 500);
    pointer('pointerUp', 700, 500);
    await act(() => new Promise((r) => setTimeout(r, 150)));
    fireEvent.click(lighty());
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('a finger that wanders a little is still a tap (LT-315)', () => {
    render(<SiteLighty businessName="Dana Studio" leadsSite={false} />);
    const touch = (type: 'pointerDown' | 'pointerMove' | 'pointerUp', x: number, y: number) =>
      act(() => { fireEvent[type](lighty(), { pointerId: 1, pointerType: 'touch', button: 0, buttons: 1, clientX: x, clientY: y }); });
    touch('pointerDown', 930, 740);
    touch('pointerMove', 940, 748);
    touch('pointerUp', 940, 748);
    fireEvent.click(lighty());
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(wrap().style.transform).toBe('');
  });

  it('forgets a press released off him: the mouse passing over later does not pick him up (LT-315)', () => {
    render(<SiteLighty businessName="Dana Studio" leadsSite={false} />);
    act(() => { fireEvent.pointerDown(lighty(), { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientX: 930, clientY: 740 }); });
    // Released just outside him: his own pointerup never comes. Later the
    // mouse passes over him with no button down.
    act(() => { fireEvent.pointerMove(lighty(), { pointerId: 1, pointerType: 'mouse', buttons: 0, clientX: 700, clientY: 500 }); });
    act(() => { fireEvent.pointerMove(lighty(), { pointerId: 1, pointerType: 'mouse', buttons: 0, clientX: 600, clientY: 400 }); });
    expect(wrap().style.transform).toBe('');
    expect(screen.getByTestId('button-3d')).toHaveAttribute('data-dragging', 'false');
  });

  it('starts where he was left last time', () => {
    saveOffset({ x: -300, y: -200 });
    render(<SiteLighty businessName="Dana Studio" leadsSite={false} />);
    expect(wrap().style.transform).toBe('translate(-300px, -200px)');
  });

  it("carries the contact button's call and WhatsApp in the chat's header", () => {
    const { unmount } = render(<SiteLighty businessName="Dana Studio" leadsSite={false} phone="050-1234567" />);
    fireEvent.click(lighty());
    expect(screen.getByLabelText('contact.option.call')).toBeTruthy();
    expect(screen.getByLabelText('contact.option.whatsapp')).toBeTruthy();
    unmount();
    render(<SiteLighty businessName="Dana Studio" leadsSite={false} />);
    fireEvent.click(lighty());
    expect(screen.queryByLabelText('contact.option.call')).toBeNull();
  });
});

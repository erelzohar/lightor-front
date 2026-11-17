import { createRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import axe from 'axe-core';
import CodeFrame from '../../components/common/CodeFrame';
import { CodeFrameError, type CodeFrameHandle } from '../../services/codeFrame';
import { stubLocation } from '../helpers/location';

/**
 * LT-677 - the code frame on a page: no frame until a code is first needed,
 * messages only to and from lightor.app and the frame's own window, the
 * frame shown only while Google's check needs the visitor.
 */
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

const ORIGIN = 'https://lightor.app';

const frame = (): HTMLIFrameElement => screen.getByTestId('code-frame').querySelector('iframe') as HTMLIFrameElement;

/** What the page posted to the frame: [message, targetOrigin] pairs. */
const spyOnFrame = () => vi.spyOn(frame().contentWindow as Window, 'postMessage').mockImplementation(() => undefined);

/** A message as the frame posts it: from its origin, from its own window. */
const say = (data: unknown, { origin = ORIGIN, source = frame().contentWindow as Window | null } = {}) =>
  act(async () => {
    window.dispatchEvent(new MessageEvent('message', { data, origin, source }));
  });

const mount = (lang = 'en') => {
  const ref = createRef<CodeFrameHandle>();
  const view = render(<CodeFrame ref={ref} lang={lang} />);
  return { ref, ...view };
};

/** Starts a send and keeps its outcome. */
const startSend = async (ref: React.RefObject<CodeFrameHandle>, phone = '+12125550123') => {
  const outcome: { done: boolean; error?: unknown } = { done: false };
  await act(async () => {
    ref.current!.send(phone).then(
      () => { outcome.done = true; },
      (error) => { outcome.done = true; outcome.error = error; },
    );
  });
  return outcome;
};

describe('the code frame (LT-677)', () => {
  beforeEach(() => stubLocation('https://dana.lightor.app/'));

  it('draws nothing and loads no frame until a code is needed', () => {
    mount();
    expect(screen.queryByTestId('code-frame')).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it("loads the frame on the first send, with this page's origin and language", async () => {
    const { ref } = mount('he');
    await startSend(ref);
    expect(frame().getAttribute('src')).toBe(`${ORIGIN}/__lt-code?parent=${encodeURIComponent('https://dana.lightor.app')}&lang=he`);
    // Out of sight: no room on the page, out of the tab order and of the reading order.
    expect(screen.getByTestId('code-frame').dataset.shown).toBe('false');
    expect(screen.getByTestId('code-frame').style.width).toBe('0px');
    expect(frame().getAttribute('aria-hidden')).toBe('true');
    expect(frame().tabIndex).toBe(-1);
    expect(frame().getAttribute('title')).toBeTruthy();
  });

  it("names a business's own domain as the parent there", async () => {
    stubLocation('https://www.dana-studio.co.il/');
    const { ref } = mount();
    await startSend(ref);
    expect(new URL(frame().src).searchParams.get('parent')).toBe('https://www.dana-studio.co.il');
  });

  it('posts the number to lightor.app only, once the frame says it is ready', async () => {
    const { ref } = mount();
    const sent = await startSend(ref);
    const posted = spyOnFrame();
    expect(posted).not.toHaveBeenCalled();

    await say({ type: 'lt-code-ready' });
    expect(posted).toHaveBeenCalledTimes(1);
    expect(posted).toHaveBeenCalledWith({ type: 'lt-code-send', phone: '+12125550123', lang: 'en' }, ORIGIN);
    expect(sent.done).toBe(false);

    await say({ type: 'lt-code-sent' });
    expect(sent).toEqual({ done: true });
  });

  it('checks a code and hands back the proof', async () => {
    const { ref } = mount();
    await startSend(ref);
    const posted = spyOnFrame();
    await say({ type: 'lt-code-ready' });
    await say({ type: 'lt-code-sent' });

    let proof: Promise<string>;
    await act(async () => { proof = ref.current!.confirm('123456'); });
    expect(posted).toHaveBeenLastCalledWith({ type: 'lt-code-confirm', code: '123456' }, ORIGIN);
    await say({ type: 'lt-code-verified', idToken: 'proof-1' });
    await expect(proof!).resolves.toBe('proof-1');
  });

  it('ignores a message from another origin or another window', async () => {
    const { ref } = mount();
    const sent = await startSend(ref);
    const posted = spyOnFrame();

    await say({ type: 'lt-code-ready' }, { origin: 'https://evil.example' });
    await say({ type: 'lt-code-ready' }, { source: window });
    await say({ type: 'lt-code-ready' }, { source: null });
    await say({ type: 'lt-code-ready' }, { origin: 'https://dana.lightor.app' });
    expect(posted).not.toHaveBeenCalled();

    await say({ type: 'lt-code-ready' });
    await say({ type: 'lt-code-sent' }, { origin: 'https://evil.example' });
    expect(sent.done).toBe(false);
    await say({ type: 'lt-code-sent' });
    expect(sent.done).toBe(true);
  });

  it('does not load the frame again on a second send or on a language switch', async () => {
    const { ref, rerender } = mount('he');
    await startSend(ref);
    const first = frame();
    const posted = spyOnFrame();
    await say({ type: 'lt-code-ready' });
    await say({ type: 'lt-code-sent' });

    rerender(<CodeFrame ref={ref} lang="en" />);
    await startSend(ref);
    expect(frame()).toBe(first);
    expect(frame().getAttribute('src')).toContain('lang=he');
    // The message carries the language of now.
    expect(posted).toHaveBeenLastCalledWith({ type: 'lt-code-send', phone: '+12125550123', lang: 'en' }, ORIGIN);
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
  });

  it("shows the frame in a dialog while Google's check needs the visitor, and hides it after", async () => {
    const { ref } = mount();
    await startSend(ref);
    const first = frame();
    await say({ type: 'lt-code-ready' });

    await say({ type: 'lt-code-attention', on: true });
    const dialog = screen.getByRole('dialog', { name: 'phone.check.title' });
    expect(dialog).toBe(screen.getByTestId('code-frame'));
    expect(dialog.dataset.shown).toBe('true');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.style.position).toBe('fixed');
    // The same frame, never loaded again, now reachable.
    expect(frame()).toBe(first);
    expect(frame().hasAttribute('aria-hidden')).toBe(false);
    expect(frame().hasAttribute('tabindex')).toBe(false);
    expect(document.activeElement).toBe(frame());
    expect(screen.getByRole('button', { name: 'phone.check.close' })).toBeTruthy();

    // The frame's own page is Google's and lightor.app's: only this page is checked.
    const results = await axe.run(document.body, {
      iframes: false,
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);

    await say({ type: 'lt-code-attention', on: false });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('code-frame').dataset.shown).toBe('false');
    expect(frame()).toBe(first);
  });

  it('lets the visitor close the check: the request fails, the frame stays for the next tap', async () => {
    const { ref } = mount();
    const sent = await startSend(ref);
    await say({ type: 'lt-code-ready' });
    await say({ type: 'lt-code-attention', on: true });

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'phone.check.close' })); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(sent.error).toBeInstanceOf(CodeFrameError);
    expect(sent.error).toMatchObject({ stage: 'send', code: 'lt/closed' });
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
  });

  it('cleans up when the form goes away: the frame, the listener, whoever waits', async () => {
    const { ref, unmount } = mount();
    const sent = await startSend(ref);
    const removed = vi.spyOn(window, 'removeEventListener');
    await act(async () => { unmount(); });
    expect(document.querySelector('iframe')).toBeNull();
    expect(removed).toHaveBeenCalledWith('message', expect.any(Function));
    expect(sent.error).toMatchObject({ code: 'lt/closed' });
    removed.mockRestore();
  });
});

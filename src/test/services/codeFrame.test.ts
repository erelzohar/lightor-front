import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CODE_CONFIRM_WAIT_MS,
  CODE_FRAME_LOAD_WAIT_MS,
  CODE_SEND_WAIT_MS,
  CodeChannel,
  CodeFrameError,
  codeFrameBase,
  codeFrameOrigin,
  codeFrameUrl,
} from '../../services/codeFrame';

/**
 * LT-677 - the conversation with the code frame: one request at a time, each
 * answered once, and never a message to the frame that a tap did not ask for.
 */

describe("the code frame's address", () => {
  it('is on lightor.app unless the build names another', () => {
    expect(codeFrameBase()).toBe('https://lightor.app/__lt-code');
    expect(codeFrameOrigin()).toBe('https://lightor.app');
  });

  it("carries the page's own origin as `parent`, and the language", () => {
    expect(codeFrameUrl('en', 'https://dana.lightor.app')).toBe(
      'https://lightor.app/__lt-code?parent=https%3A%2F%2Fdana.lightor.app&lang=en'
    );
    expect(codeFrameUrl('he', 'https://www.dana-studio.co.il')).toBe(
      'https://lightor.app/__lt-code?parent=https%3A%2F%2Fwww.dana-studio.co.il&lang=he'
    );
    expect(new URL(codeFrameUrl('en')).searchParams.get('parent')).toBe(window.location.origin);
  });

  it('follows another base address, origin included', () => {
    const base = 'http://localhost:8787/__lt-code';
    expect(codeFrameOrigin(base)).toBe('http://localhost:8787');
    expect(codeFrameUrl('fr', 'http://localhost:5173', base)).toBe(
      'http://localhost:8787/__lt-code?parent=http%3A%2F%2Flocalhost%3A5173&lang=fr'
    );
  });
});

describe('the code channel', () => {
  let post: ReturnType<typeof vi.fn<(message: Record<string, unknown>) => void>>;
  let attention: ReturnType<typeof vi.fn<(on: boolean) => void>>;
  let channel: CodeChannel;

  /** The outcome of a promise, without waiting on it. */
  const watch = <T,>(promise: Promise<T>) => {
    const seen: { value?: T; error?: unknown; done: boolean } = { done: false };
    promise.then(
      (value) => { seen.value = value; seen.done = true; },
      (error) => { seen.error = error; seen.done = true; },
    );
    return seen;
  };
  const tick = () => vi.advanceTimersByTimeAsync(0);

  beforeEach(() => {
    vi.useFakeTimers();
    post = vi.fn<(message: Record<string, unknown>) => void>();
    attention = vi.fn<(on: boolean) => void>();
    channel = new CodeChannel(post, attention);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('posts nothing by itself', async () => {
    channel.receive({ type: 'lt-code-ready' });
    await tick();
    expect(post).not.toHaveBeenCalled();
  });

  it('sends the number once the frame is ready, and resolves when the code went out', async () => {
    const sent = watch(channel.send('+12125550123', 'en'));
    await tick();
    expect(post).not.toHaveBeenCalled();

    channel.receive({ type: 'lt-code-ready' });
    await tick();
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith({ type: 'lt-code-send', phone: '+12125550123', lang: 'en' });
    expect(sent.done).toBe(false);

    channel.receive({ type: 'lt-code-sent' });
    await tick();
    expect(sent).toMatchObject({ done: true, value: undefined });
    expect(sent.error).toBeUndefined();
  });

  it('sends at once when the frame was ready already, one message per request', async () => {
    channel.receive({ type: 'lt-code-ready' });
    const first = watch(channel.send('+12125550123', 'en'));
    await tick();
    channel.receive({ type: 'lt-code-sent' });
    await tick();
    expect(first.done).toBe(true);

    watch(channel.send('+12125550123', 'en'));
    await tick();
    expect(post).toHaveBeenCalledTimes(2);
    // Time passing never sends again.
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("rejects a send with the frame's own code", async () => {
    channel.receive({ type: 'lt-code-ready' });
    const sent = watch(channel.send('+12125550123', 'en'));
    await tick();
    channel.receive({ type: 'lt-code-error', stage: 'send', code: 'auth/too-many-requests' });
    await tick();
    expect(sent.error).toBeInstanceOf(CodeFrameError);
    expect(sent.error).toMatchObject({ stage: 'send', code: 'auth/too-many-requests' });
  });

  it('confirms the code and resolves with the proof', async () => {
    channel.receive({ type: 'lt-code-ready' });
    const confirmed = watch(channel.confirm('123456'));
    expect(post).toHaveBeenCalledWith({ type: 'lt-code-confirm', code: '123456' });
    channel.receive({ type: 'lt-code-verified', idToken: 'proof-1' });
    await tick();
    expect(confirmed).toMatchObject({ done: true, value: 'proof-1' });
  });

  it('rejects a wrong code, and takes the next try', async () => {
    channel.receive({ type: 'lt-code-ready' });
    const wrong = watch(channel.confirm('000000'));
    channel.receive({ type: 'lt-code-error', stage: 'confirm', code: 'auth/invalid-verification-code' });
    await tick();
    expect(wrong.error).toMatchObject({ stage: 'confirm', code: 'auth/invalid-verification-code' });

    const right = watch(channel.confirm('123456'));
    channel.receive({ type: 'lt-code-verified', idToken: 'proof-2' });
    await tick();
    expect(right.value).toBe('proof-2');
  });

  it('has no code to confirm before a frame ever loaded, and posts nothing', async () => {
    const confirmed = watch(channel.confirm('123456'));
    await tick();
    expect(confirmed.error).toMatchObject({ stage: 'confirm', code: 'lt/no-code-sent' });
    expect(post).not.toHaveBeenCalled();
  });

  it('ignores an answer to a question it did not ask', async () => {
    channel.receive({ type: 'lt-code-ready' });
    const sent = watch(channel.send('+12125550123', 'en'));
    await tick();
    channel.receive({ type: 'lt-code-verified', idToken: 'stray' });
    channel.receive({ type: 'lt-code-error', stage: 'confirm', code: 'auth/code-expired' });
    channel.receive({ type: 'something-else' });
    channel.receive('lt-code-sent');
    channel.receive(null);
    await tick();
    expect(sent.done).toBe(false);

    const confirmed = watch(channel.confirm('123456'));
    await tick();
    // The send it replaced is over; a proof without a token is no proof.
    expect(sent.error).toMatchObject({ code: 'lt/superseded' });
    channel.receive({ type: 'lt-code-sent' });
    channel.receive({ type: 'lt-code-verified' });
    channel.receive({ type: 'lt-code-verified', idToken: '' });
    await tick();
    expect(confirmed.done).toBe(false);
  });

  it('gives up on a frame that never loads, and never posts to it afterwards', async () => {
    const sent = watch(channel.send('+12125550123', 'en'));
    await vi.advanceTimersByTimeAsync(CODE_FRAME_LOAD_WAIT_MS + 1);
    expect(sent.error).toMatchObject({ stage: 'send', code: 'lt/timeout' });

    channel.receive({ type: 'lt-code-ready' });
    await tick();
    expect(post).not.toHaveBeenCalled();
  });

  it('gives up on a frame that does not answer', async () => {
    channel.receive({ type: 'lt-code-ready' });
    const sent = watch(channel.send('+12125550123', 'en'));
    await vi.advanceTimersByTimeAsync(CODE_SEND_WAIT_MS + 1);
    expect(sent.error).toMatchObject({ stage: 'send', code: 'lt/timeout' });

    const confirmed = watch(channel.confirm('123456'));
    await vi.advanceTimersByTimeAsync(CODE_CONFIRM_WAIT_MS + 1);
    expect(confirmed.error).toMatchObject({ stage: 'confirm', code: 'lt/timeout' });
  });

  it("stops the clock while Google's check is showing, and tells the page", async () => {
    channel.receive({ type: 'lt-code-ready' });
    const sent = watch(channel.send('+12125550123', 'en'));
    await tick();
    channel.receive({ type: 'lt-code-attention', on: true });
    expect(attention).toHaveBeenLastCalledWith(true);
    await vi.advanceTimersByTimeAsync(10 * CODE_SEND_WAIT_MS);
    expect(sent.done).toBe(false);

    channel.receive({ type: 'lt-code-attention', on: false });
    expect(attention).toHaveBeenLastCalledWith(false);
    channel.receive({ type: 'lt-code-sent' });
    await tick();
    expect(sent.done).toBe(true);
    expect(sent.error).toBeUndefined();
  });

  it('closing ends whoever waits, and nothing is posted for them later', async () => {
    const sent = watch(channel.send('+12125550123', 'en'));
    channel.close();
    await tick();
    expect(sent.error).toMatchObject({ stage: 'send', code: 'lt/closed' });
    channel.receive({ type: 'lt-code-ready' });
    await tick();
    expect(post).not.toHaveBeenCalled();
  });
});

/**
 * LT-677: the code frame's address and its postMessage protocol.
 *
 * Firebase sends a phone code only from lightor.app itself, so the sign-in
 * of a number abroad runs in a frame served from there
 * (`https://lightor.app/__lt-code?parent=<this page's origin>&lang=<lang>`),
 * and the page talks to it with postMessage:
 *
 * - page -> frame: `{ type: 'lt-code-send', phone: '+1...', lang? }`,
 *   `{ type: 'lt-code-confirm', code: '123456' }`
 * - frame -> page: `{ type: 'lt-code-ready' }`, `{ type: 'lt-code-sent' }`,
 *   `{ type: 'lt-code-verified', idToken }`,
 *   `{ type: 'lt-code-error', stage: 'send' | 'confirm', code }`,
 *   `{ type: 'lt-code-attention', on }`
 *
 * The page posts to the frame's own origin only, and listens only to
 * messages from that origin and from the frame's own window. There is no
 * Firebase key, config or SDK in this app: the frame holds them.
 */

/** Where the frame lives unless the build names another address (`VITE_CODE_FRAME_URL`). */
const DEFAULT_CODE_FRAME_URL = 'https://lightor.app/__lt-code';

/** The frame's base address. */
export const codeFrameBase = (): string =>
  String(import.meta.env.VITE_CODE_FRAME_URL ?? '').trim() || DEFAULT_CODE_FRAME_URL;

/** The one origin the page posts to and listens to. */
export const codeFrameOrigin = (base: string = codeFrameBase()): string => new URL(base).origin;

/**
 * The frame's address for this page. `parent` is exactly the page's own
 * origin (a Lightor address or the business's own domain): the frame posts
 * its messages there and nowhere else.
 */
export const codeFrameUrl = (
  lang: string,
  parent: string = window.location.origin,
  base: string = codeFrameBase(),
): string => {
  const url = new URL(base);
  url.searchParams.set('parent', parent);
  url.searchParams.set('lang', lang);
  return url.toString();
};

/**
 * A code that was not sent or not accepted. `code` is Firebase's
 * (`auth/invalid-verification-code`, `auth/code-expired`,
 * `auth/too-many-requests`, `auth/invalid-phone-number`, ...), the frame's
 * own (`lt/home-number`, `lt/no-code-sent`), or this page's: `lt/timeout`
 * (the frame did not answer), `lt/closed` (the visitor closed Google's check,
 * or the form went away), `lt/superseded` (a newer request took its place).
 */
export class CodeFrameError extends Error {
  readonly stage: 'send' | 'confirm';
  readonly code: string;

  constructor(stage: 'send' | 'confirm', code: string) {
    super(code || 'code frame error');
    this.name = 'CodeFrameError';
    this.stage = stage;
    this.code = code;
  }
}

/** What a form holds of the frame. */
export interface CodeFrameHandle {
  /** Asks for a code to a number abroad (E.164). Resolves once it went out. */
  send: (phone: string) => Promise<void>;
  /** Checks the code the visitor typed. Resolves with the proof the API exchanges for a phone token. */
  confirm: (code: string) => Promise<string>;
}

/** How long the frame may take to load, to send, or to check, before the form hears "failed". */
export const CODE_FRAME_LOAD_WAIT_MS = 20_000;
export const CODE_SEND_WAIT_MS = 60_000;
export const CODE_CONFIRM_WAIT_MS = 30_000;

interface Pending {
  stage: 'send' | 'confirm';
  resolve: (value: string) => void;
  reject: (error: CodeFrameError) => void;
  waitMs: number;
  timer: ReturnType<typeof setTimeout> | null;
}

/**
 * The conversation with one frame: what was asked, and what the frame said.
 *
 * One request at a time (a newer one ends the older), each answered once:
 * by the frame, by its clock running out, or by `close`. Nothing here ever
 * asks the frame by itself or asks twice: a `send` is one message, posted
 * when the frame has said it is ready.
 */
export class CodeChannel {
  private pending: Pending | null = null;
  private isReady = false;
  private readonly ready: Promise<void>;
  private markReady: () => void = () => undefined;
  private readonly post: (message: Record<string, unknown>) => void;
  private readonly onAttention: (on: boolean) => void;

  /**
   * @param post posts a message to the frame's window, at the frame's origin
   * @param onAttention Google's check is (no longer) showing something
   */
  constructor(post: (message: Record<string, unknown>) => void, onAttention: (on: boolean) => void) {
    this.post = post;
    this.onAttention = onAttention;
    this.ready = new Promise<void>((resolve) => {
      this.markReady = resolve;
    });
  }

  send(phone: string, lang: string): Promise<void> {
    const { request, result } = this.begin('send', this.isReady ? CODE_SEND_WAIT_MS : CODE_FRAME_LOAD_WAIT_MS);
    void this.ready.then(() => {
      // Still this request: not timed out, closed or replaced while the frame loaded.
      if (this.pending !== request) return;
      request.waitMs = CODE_SEND_WAIT_MS;
      this.arm(request);
      this.post({ type: 'lt-code-send', phone, lang });
    });
    return result.then(() => undefined);
  }

  confirm(code: string): Promise<string> {
    // A frame that never loaded sent no code.
    if (!this.isReady) return Promise.reject(new CodeFrameError('confirm', 'lt/no-code-sent'));
    const { result } = this.begin('confirm', CODE_CONFIRM_WAIT_MS);
    this.post({ type: 'lt-code-confirm', code });
    return result;
  }

  /** A message from the frame, its origin and its window already checked. */
  receive(message: unknown): void {
    if (!message || typeof message !== 'object') return;
    const data = message as { type?: unknown; idToken?: unknown; stage?: unknown; code?: unknown; on?: unknown };
    const request = this.pending;
    if (data.type === 'lt-code-ready') {
      this.isReady = true;
      this.markReady();
    } else if (data.type === 'lt-code-sent') {
      if (request?.stage === 'send') this.settle({ value: '' });
    } else if (data.type === 'lt-code-verified') {
      if (request?.stage === 'confirm' && typeof data.idToken === 'string' && data.idToken) this.settle({ value: data.idToken });
    } else if (data.type === 'lt-code-error') {
      if (request && (data.stage === undefined || data.stage === request.stage)) {
        this.settle({ code: typeof data.code === 'string' ? data.code : '' });
      }
    } else if (data.type === 'lt-code-attention') {
      const on = data.on === true;
      this.onAttention(on);
      // The visitor is answering Google's check: the clock waits for them.
      if (request && on && request.timer) {
        clearTimeout(request.timer);
        request.timer = null;
      } else if (request && !on) {
        this.arm(request);
      }
    }
  }

  /** The visitor closed the check, or the form went away: whoever waits hears so. */
  close(): void {
    this.settle({ code: 'lt/closed' });
  }

  private begin(stage: Pending['stage'], waitMs: number): { request: Pending; result: Promise<string> } {
    this.settle({ code: 'lt/superseded' });
    const request: Pending = { stage, waitMs, timer: null, resolve: () => undefined, reject: () => undefined };
    const result = new Promise<string>((resolve, reject) => {
      request.resolve = resolve;
      request.reject = reject;
    });
    this.pending = request;
    this.arm(request);
    return { request, result };
  }

  private arm(request: Pending): void {
    if (request.timer) clearTimeout(request.timer);
    request.timer = setTimeout(() => {
      if (this.pending === request) this.settle({ code: 'lt/timeout' });
    }, request.waitMs);
  }

  private settle(outcome: { value: string } | { code: string }): void {
    const request = this.pending;
    if (!request) return;
    this.pending = null;
    if (request.timer) clearTimeout(request.timer);
    if ('value' in outcome) request.resolve(outcome.value);
    else request.reject(new CodeFrameError(request.stage, outcome.code));
  }
}

/** Above everything the site draws, the dropdown's panel included. */
export const CODE_FRAME_ATTENTION_Z = 10200;

import { createRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import SiteTurnstile, { type SiteTurnstileHandle } from '../../components/SiteTurnstile';
import { INLINE_CONFIG_ID } from '../../services/edgeShell';
import { passFrameUrl, resetSiteForTests } from '../../services/site';
import { stubLocation } from '../helpers/location';

/**
 * LT-661: the visitor check wherever the site lives. On a Lightor host it is
 * the Turnstile widget itself, as before. On a business's own domain the
 * widget cannot run in the page (Turnstile lists its hostnames), so it runs
 * in a frame from the site's Lightor address and posts its token here.
 */
const mocks = vi.hoisted(() => ({
  widget: vi.fn(),
  mounts: { count: 0 },
}));

vi.mock('@marsidev/react-turnstile', async () => {
  const React = await import('react');
  return {
    Turnstile: (props: Record<string, unknown>) => {
      mocks.widget(props);
      React.useEffect(() => { mocks.mounts.count += 1; }, []);
      return React.createElement('div', { 'data-testid': 'real-widget' });
    },
  };
});

const OWN = 'www.dana-studio.co.il';
const FRAME_ORIGIN = 'https://dana.lightor.app';

const inline = (payload: unknown) => {
  const script = document.createElement('script');
  script.id = INLINE_CONFIG_ID;
  script.setAttribute('type', 'application/json');
  script.textContent = JSON.stringify(payload);
  document.head.appendChild(script);
};

const frame = (): HTMLIFrameElement => screen.getByTestId('pass-frame').querySelector('iframe') as HTMLIFrameElement;

/** A message as the frame posts it: from its origin, from its own window. */
const say = (data: unknown, { origin = FRAME_ORIGIN, source = frame().contentWindow as Window | null } = {}) =>
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, origin, source }));
  });

describe('the visitor check (LT-661)', () => {
  beforeEach(() => {
    mocks.widget.mockClear();
    mocks.mounts.count = 0;
    resetSiteForTests();
  });
  afterEach(() => {
    document.getElementById(INLINE_CONFIG_ID)?.remove();
  });

  describe('on a Lightor host', () => {
    beforeEach(() => stubLocation('https://dana.lightor.app/'));

    it('is the widget itself, with the same options and callbacks, and no frame', () => {
      const onSuccess = vi.fn();
      const options = { theme: 'auto', size: 'flexible', appearance: 'interaction-only' } as const;
      render(<SiteTurnstile onSuccess={onSuccess} options={options} />);

      expect(screen.getByTestId('real-widget')).toBeInTheDocument();
      expect(screen.queryByTestId('pass-frame')).toBeNull();
      expect(document.querySelector('iframe')).toBeNull();
      const props = mocks.widget.mock.calls[0][0] as Record<string, unknown>;
      expect(props.onSuccess).toBe(onSuccess);
      expect(props.options).toBe(options);
      expect(props).toHaveProperty('siteKey');
      expect(props).not.toHaveProperty('onError');
      expect(props).not.toHaveProperty('onExpire');
    });

    it('passes the error and expiry callbacks on when they are given', () => {
      const onError = vi.fn();
      const onExpire = vi.fn();
      render(<SiteTurnstile onSuccess={vi.fn()} onError={onError} onExpire={onExpire} />);
      const props = mocks.widget.mock.calls[0][0] as Record<string, unknown>;
      expect(props.onError).toBe(onError);
      expect(props.onExpire).toBe(onExpire);
    });

    it('draws the widget again on reset, for a new token', () => {
      const ref = createRef<SiteTurnstileHandle>();
      render(<SiteTurnstile ref={ref} onSuccess={vi.fn()} />);
      expect(mocks.mounts.count).toBe(1);
      act(() => ref.current?.reset());
      expect(mocks.mounts.count).toBe(2);
    });

    it('ignores a frame message: nothing listens here', async () => {
      const onSuccess = vi.fn();
      render(<SiteTurnstile onSuccess={onSuccess} />);
      await say({ type: 'lt-pass', token: 'from-nowhere' }, { source: null });
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("on a business's own domain", () => {
    beforeEach(() => {
      stubLocation(`https://${OWN}/contact`);
      inline({ subDomain: 'dana', host: OWN, config: {} });
    });

    it("is a frame from the site's Lightor address, carrying the widget's options", () => {
      render(<SiteTurnstile onSuccess={vi.fn()} options={{ theme: 'auto', size: 'flexible', appearance: 'interaction-only' }} />);
      expect(screen.queryByTestId('real-widget')).toBeNull();
      expect(mocks.widget).not.toHaveBeenCalled();
      expect(frame().getAttribute('src')).toBe(
        `${FRAME_ORIGIN}/__lt-pass?parent=${OWN}&theme=auto&appearance=interaction-only&size=flexible`
      );
      expect(frame().getAttribute('title')).toBeTruthy();
    });

    it('names only the options the call site set, the language as `lang`', () => {
      expect(passFrameUrl('dana', OWN)).toBe(`${FRAME_ORIGIN}/__lt-pass?parent=${OWN}`);
      expect(passFrameUrl('dana', OWN, { theme: 'dark', language: 'he', appearance: 'always', size: 'compact' })).toBe(
        `${FRAME_ORIGIN}/__lt-pass?parent=${OWN}&theme=dark&lang=he&appearance=always&size=compact`
      );
    });

    it("hands the frame's token to onSuccess", async () => {
      const onSuccess = vi.fn();
      render(<SiteTurnstile onSuccess={onSuccess} />);
      await say({ type: 'lt-pass', token: 'tok-1' });
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith('tok-1');
      // The widget in the frame renews an expired token by itself: another message, another call.
      await say({ type: 'lt-pass', token: 'tok-2' });
      expect(onSuccess).toHaveBeenLastCalledWith('tok-2');
    });

    it('ignores a message from another origin, from another window, or of another shape', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      render(<SiteTurnstile onSuccess={onSuccess} onError={onError} />);

      await say({ type: 'lt-pass', token: 'stolen' }, { origin: 'https://evil.example.com' });
      await say({ type: 'lt-pass', token: 'stolen' }, { origin: `https://${OWN}` });
      await say({ type: 'lt-pass', token: 'stolen' }, { origin: 'https://dana.lightor.app.attacker.com' });
      await say({ type: 'lt-pass', token: 'stolen' }, { origin: 'https://other.lightor.app' });
      // The right origin, but not the frame this widget drew.
      await say({ type: 'lt-pass', token: 'stolen' }, { source: window });
      await say({ type: 'lt-pass', token: 'stolen' }, { source: null });
      await say({ type: 'lt-pass' });
      await say({ type: 'lt-pass', token: '' });
      await say({ type: 'lt-pass', token: 42 });
      await say('lt-pass');
      await say(null);
      await say({ type: 'something-else', token: 'x' });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('reports an error with its code, and an expired token', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const onExpire = vi.fn();
      render(<SiteTurnstile onSuccess={onSuccess} onError={onError} onExpire={onExpire} />);

      await say({ type: 'lt-pass-error', code: '110200' });
      expect(onError).toHaveBeenCalledWith('110200');
      await say({ type: 'lt-pass-error', code: 300030 });
      expect(onError).toHaveBeenLastCalledWith('300030');
      await say({ type: 'lt-pass-expired' });
      expect(onExpire).toHaveBeenCalledTimes(1);
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('works without error and expiry callbacks, as the call sites use it', async () => {
      render(<SiteTurnstile onSuccess={vi.fn()} />);
      await say({ type: 'lt-pass-error', code: '110200' });
      await say({ type: 'lt-pass-expired' });
      expect(frame()).toBeInTheDocument();
    });

    it('keeps a widget that shows only when needed out of sight until the frame asks for the visitor', async () => {
      render(<SiteTurnstile onSuccess={vi.fn()} options={{ theme: 'auto', size: 'flexible', appearance: 'interaction-only' }} />);
      const box = screen.getByTestId('pass-frame');
      expect(box).toHaveAttribute('data-shown', 'false');
      expect(box.style.height).toBe('0px');
      expect(box.style.overflow).toBe('hidden');
      expect(frame()).toHaveAttribute('aria-hidden', 'true');
      expect(frame()).toHaveAttribute('tabindex', '-1');
      // Out of sight, the frame itself keeps the widget's size.
      expect(frame().style.height).toBe('65px');

      await say({ type: 'lt-pass-interactive', on: true });
      expect(box).toHaveAttribute('data-shown', 'true');
      expect(box.style.height).toBe('');
      expect(box.style.overflow).toBe('');
      expect(frame()).not.toHaveAttribute('aria-hidden');
      expect(frame()).not.toHaveAttribute('tabindex');

      await say({ type: 'lt-pass-interactive', on: false });
      expect(box).toHaveAttribute('data-shown', 'false');
      expect(box.style.height).toBe('0px');

      // Only a real `true` shows it, and only from the frame.
      await say({ type: 'lt-pass-interactive', on: 'yes' });
      await say({ type: 'lt-pass-interactive', on: true }, { origin: 'https://evil.example.com' });
      expect(box).toHaveAttribute('data-shown', 'false');
    });

    it('always shows a widget that always shows, at the widget\'s size', async () => {
      render(<SiteTurnstile onSuccess={vi.fn()} options={{ theme: 'auto', size: 'normal', appearance: 'always' }} />);
      const box = screen.getByTestId('pass-frame');
      expect(box).toHaveAttribute('data-shown', 'true');
      expect(box.style.width).toBe('300px');
      expect(frame().style.height).toBe('65px');
      await say({ type: 'lt-pass-interactive', on: false });
      expect(box).toHaveAttribute('data-shown', 'true');
    });

    it('sizes a compact and a flexible widget as Cloudflare does', () => {
      const { unmount } = render(<SiteTurnstile onSuccess={vi.fn()} options={{ size: 'compact' }} />);
      expect(screen.getByTestId('pass-frame').style.width).toBe('150px');
      expect(frame().style.height).toBe('140px');
      unmount();
      render(<SiteTurnstile onSuccess={vi.fn()} options={{ size: 'flexible' }} />);
      expect(screen.getByTestId('pass-frame').style.width).toBe('100%');
      expect(screen.getByTestId('pass-frame').style.minWidth).toBe('300px');
    });

    it('loads the frame again on reset, out of sight again, and listens to the new one only', async () => {
      const ref = createRef<SiteTurnstileHandle>();
      const onSuccess = vi.fn();
      render(<SiteTurnstile ref={ref} onSuccess={onSuccess} options={{ appearance: 'interaction-only' }} />);
      const first = frame();
      const firstWindow = first.contentWindow;
      await say({ type: 'lt-pass-interactive', on: true });
      expect(screen.getByTestId('pass-frame')).toHaveAttribute('data-shown', 'true');

      act(() => ref.current?.reset());

      const second = frame();
      expect(second).not.toBe(first);
      expect(first.isConnected).toBe(false);
      expect(second.getAttribute('src')).toBe(first.getAttribute('src'));
      expect(screen.getByTestId('pass-frame')).toHaveAttribute('data-shown', 'false');

      await say({ type: 'lt-pass', token: 'old-frame' }, { source: firstWindow });
      expect(onSuccess).not.toHaveBeenCalled();
      await say({ type: 'lt-pass', token: 'new-frame' });
      expect(onSuccess).toHaveBeenCalledWith('new-frame');
    });

    it('stops listening when it leaves the page', async () => {
      const onSuccess = vi.fn();
      const { unmount } = render(<SiteTurnstile onSuccess={onSuccess} />);
      const source = frame().contentWindow;
      unmount();
      await say({ type: 'lt-pass', token: 'late' }, { source });
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("on a business's own domain the edge served bare", () => {
    let mock: MockAdapter;
    beforeEach(() => {
      mock = new MockAdapter(axios);
      stubLocation(`https://${OWN}/`);
    });
    afterEach(() => mock.restore());

    it('draws the frame once the API has named the site', async () => {
      mock.onGet(`https://${OWN}/api/web-configs/host/${OWN}`).reply(200, { success: true, data: { subDomain: 'dana' } });
      const onSuccess = vi.fn();
      render(<SiteTurnstile onSuccess={onSuccess} options={{ appearance: 'always' }} />);
      expect(screen.queryByTestId('pass-frame')).toBeNull();

      await waitFor(() => expect(screen.getByTestId('pass-frame')).toBeInTheDocument());
      expect(frame().getAttribute('src')).toBe(`${FRAME_ORIGIN}/__lt-pass?parent=${OWN}&appearance=always`);
      await say({ type: 'lt-pass', token: 'tok' });
      expect(onSuccess).toHaveBeenCalledWith('tok');
    });

    it('draws nothing when no site answers for this host', async () => {
      mock.onGet(`https://${OWN}/api/web-configs/host/${OWN}`).reply(404, { success: false });
      render(<SiteTurnstile onSuccess={vi.fn()} />);
      await waitFor(() => expect(mock.history.get).toHaveLength(1));
      expect(screen.queryByTestId('pass-frame')).toBeNull();
      expect(screen.queryByTestId('real-widget')).toBeNull();
    });
  });
});

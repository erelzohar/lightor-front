import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { onOutsideHost, passFrameOrigin, passFrameUrl, siteName, siteNameNow, type PassFrameOptions } from '../services/site';

/**
 * LT-661: the visitor check (Cloudflare Turnstile), wherever the site lives.
 *
 * On a Lightor host it is the widget itself, as it always was. A Turnstile
 * widget only runs on hostnames listed on it (ten at most), so on a
 * business's own domain it cannot draw in the page: there it draws inside a
 * frame served from the site's Lightor address, which posts its token to
 * this page. The same callbacks either way, and the token arrives later
 * either way.
 */
export type SiteTurnstileOptions = PassFrameOptions;

export interface SiteTurnstileProps {
  onSuccess?: (token: string) => void;
  onError?: (code: string) => void;
  onExpire?: () => void;
  options?: SiteTurnstileOptions;
}

export interface SiteTurnstileHandle {
  /** A new check and a new token: the widget is drawn again, the frame loads again. */
  reset: () => void;
}

/** The widget's own sizes (Cloudflare's): the frame takes the same room. */
const FRAME_SIZE: Record<NonNullable<SiteTurnstileOptions['size']>, CSSProperties> = {
  normal: { width: 300, height: 65 },
  compact: { width: 150, height: 140 },
  flexible: { width: '100%', minWidth: 300, height: 65 },
};

/** What the real widget's own frame is called. */
const FRAME_TITLE = 'Widget containing a Cloudflare security challenge';

/** The site's name: known at once nearly always, else when the API has named this host. */
const useSiteName = (): string | null => {
  const [name, setName] = useState<string | null>(siteNameNow);
  useEffect(() => {
    if (name !== null) return;
    let live = true;
    siteName()
      .then((found) => { if (live) setName(found); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [name]);
  return name;
};

const PassFrame = ({ round, onSuccess, onError, onExpire, options }: SiteTurnstileProps & { round: number }) => {
  const name = useSiteName();
  const frame = useRef<HTMLIFrameElement>(null);
  // A widget that shows itself only when it needs the visitor stays out of
  // sight until the frame says so; one that always shows is always shown.
  const quiet = options?.appearance === 'interaction-only' || options?.appearance === 'execute';
  const [needsVisitor, setNeedsVisitor] = useState(false);
  // The newest callbacks, without listening again on every render.
  const callbacks = useRef({ onSuccess, onError, onExpire });
  useEffect(() => { callbacks.current = { onSuccess, onError, onExpire }; });

  const origin = name ? passFrameOrigin(name) : null;

  // A frame loaded again starts out of sight again.
  useEffect(() => { setNeedsVisitor(false); }, [round, origin]);

  useEffect(() => {
    if (!origin) return;
    const onMessage = (event: MessageEvent) => {
      // Only the frame this component drew, at the site's Lightor address.
      if (event.origin !== origin) return;
      if (!frame.current || event.source !== frame.current.contentWindow) return;
      const data = event.data as { type?: unknown; token?: unknown; code?: unknown; on?: unknown } | null;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'lt-pass') {
        if (typeof data.token === 'string' && data.token) callbacks.current.onSuccess?.(data.token);
      } else if (data.type === 'lt-pass-error') {
        callbacks.current.onError?.(data.code === undefined || data.code === null ? '' : String(data.code));
      } else if (data.type === 'lt-pass-expired') {
        callbacks.current.onExpire?.();
      } else if (data.type === 'lt-pass-interactive') {
        setNeedsVisitor(data.on === true);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [origin]);

  if (!name) return null;

  const shown = !quiet || needsVisitor;
  const { height, ...box } = FRAME_SIZE[options?.size ?? 'normal'];
  return (
    <div
      data-testid="pass-frame"
      data-shown={shown ? 'true' : 'false'}
      // Out of sight, the frame keeps its real size (the widget runs in it)
      // and takes no room on the page.
      style={shown ? box : { ...box, height: 0, overflow: 'hidden' }}
    >
      <iframe
        key={round}
        ref={frame}
        src={passFrameUrl(name, window.location.hostname, options)}
        title={FRAME_TITLE}
        scrolling="no"
        aria-hidden={shown ? undefined : true}
        tabIndex={shown ? undefined : -1}
        style={{ display: 'block', border: 0, width: '100%', height, background: 'transparent', colorScheme: 'normal' }}
      />
    </div>
  );
};

const SiteTurnstile = forwardRef<SiteTurnstileHandle, SiteTurnstileProps>(function SiteTurnstile(props, ref) {
  const [round, setRound] = useState(0);
  useImperativeHandle(ref, () => ({ reset: () => setRound((now) => now + 1) }), []);

  if (onOutsideHost()) return <PassFrame {...props} round={round} />;

  const { onSuccess, onError, onExpire, options } = props;
  return (
    <Turnstile
      key={round}
      siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
      onSuccess={onSuccess}
      {...(onError ? { onError } : {})}
      {...(onExpire ? { onExpire } : {})}
      options={options}
    />
  );
});

export default SiteTurnstile;

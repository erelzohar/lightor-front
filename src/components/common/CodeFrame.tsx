import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { CODE_FRAME_ATTENTION_Z, CodeChannel, codeFrameOrigin, codeFrameUrl, type CodeFrameHandle } from '../../services/codeFrame';

/**
 * LT-677: the code frame, for a number abroad.
 *
 * The code of an Israeli number is sent and checked by the API. A number
 * abroad gets its code from Firebase, which sends one only from lightor.app
 * itself: so the sign-in runs in a frame served from there, and this page
 * talks to it with postMessage (the protocol is in services/codeFrame). The
 * frame has no fields and is not meant to be seen.
 *
 * - Nothing is drawn, and no frame is loaded, until the first `send`.
 * - `send(phone)` asks for a code and resolves once it went out;
 *   `confirm(code)` resolves with the proof (`idToken`) the API exchanges for
 *   a phone token. Both reject with a `CodeFrameError` carrying the frame's
 *   code. Neither is ever called by this component itself, and neither
 *   retries: one tap on the form's button, one message to the frame.
 * - When Google's check may be showing something (`lt-code-attention`), the
 *   frame is shown in a small centred panel over a dim backdrop until it says
 *   it is done; the visitor may also close it, which fails the request.
 */

/** Out of sight the frame keeps its real size (the sign-in runs in it) and takes no room. */
const HIDDEN: CSSProperties = { position: 'fixed', top: 0, left: 0, width: 0, height: 0, overflow: 'hidden' };
const BACKDROP: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: CODE_FRAME_ATTENTION_Z,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  background: 'rgba(0, 0, 0, 0.55)',
};
const PANEL: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: 320,
  maxWidth: '100%',
  height: 520,
  maxHeight: '100%',
  overflow: 'hidden',
  borderRadius: 12,
  background: '#ffffff',
  boxShadow: '0 24px 60px -20px rgba(0, 0, 0, 0.6)',
};
const FRAME: CSSProperties = { display: 'block', border: 0, background: '#ffffff', colorScheme: 'normal' };
const FRAME_HIDDEN: CSSProperties = { ...FRAME, width: 320, height: 480 };
const FRAME_SHOWN: CSSProperties = { ...FRAME, width: '100%', flex: '1 1 auto', minHeight: 0 };
const CLOSE: CSSProperties = {
  alignSelf: 'flex-end',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  flexShrink: 0,
  color: '#1f2937',
  background: 'transparent',
  border: 0,
  cursor: 'pointer',
};

const CodeFrame = forwardRef<CodeFrameHandle, { lang: string }>(function CodeFrame({ lang }, ref) {
  const { t } = useLanguage();
  // The frame's address, fixed when it is first needed: a language switch
  // must not load the frame again in the middle of a code.
  const [src, setSrc] = useState<string | null>(null);
  const [attention, setAttention] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const language = useRef(lang);
  language.current = lang;
  const [channel] = useState(
    () => new CodeChannel((message) => frame.current?.contentWindow?.postMessage(message, codeFrameOrigin()), setAttention),
  );

  useImperativeHandle(ref, () => ({
    send: (phone: string) => {
      setSrc((now) => now ?? codeFrameUrl(language.current));
      return channel.send(phone, language.current);
    },
    confirm: (code: string) => channel.confirm(code),
  }), [channel]);

  useEffect(() => {
    if (!src) return;
    const origin = codeFrameOrigin();
    const onMessage = (event: MessageEvent) => {
      // Only the frame this component drew, at the code frame's own address.
      if (event.origin !== origin) return;
      if (!frame.current || event.source !== frame.current.contentWindow) return;
      channel.receive(event.data);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [src, channel]);

  // The form is gone: whoever still waits hears so, and no timer outlives it.
  useEffect(() => () => channel.close(), [channel]);

  // The check is the visitor's to answer: the keyboard goes to it.
  useEffect(() => {
    if (attention) frame.current?.focus();
  }, [attention]);

  if (!src) return null;

  const close = () => {
    setAttention(false);
    channel.close();
  };

  const title = t('phone.check.title');
  return createPortal(
    <div
      data-testid="code-frame"
      data-shown={attention ? 'true' : 'false'}
      role={attention ? 'dialog' : undefined}
      aria-modal={attention ? true : undefined}
      aria-label={attention ? title : undefined}
      style={attention ? BACKDROP : HIDDEN}
    >
      <div style={attention ? PANEL : undefined}>
        {attention && (
          <button type="button" onClick={close} aria-label={t('phone.check.close')} style={CLOSE}>
            <X aria-hidden="true" style={{ width: 20, height: 20 }} />
          </button>
        )}
        <iframe
          ref={frame}
          src={src}
          title={title}
          aria-hidden={attention ? undefined : true}
          tabIndex={attention ? undefined : -1}
          style={attention ? FRAME_SHOWN : FRAME_HIDDEN}
        />
      </div>
    </div>,
    document.body,
  );
});

export default CodeFrame;

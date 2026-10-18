import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Phone, Send, X } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { useLanguage } from '../../contexts/LanguageContext';
import { visitorPass, useVisitorPass } from '../../services/visitorPass';
import siteAssistantService, { type AssistantTurn } from '../../services/SiteAssistantService';
import { reducedMotion } from '../../services/generateReveal';
import { scrollToSection, sectionOf } from '../../utils/sections';
import { replyParts } from './replyText';
import { DRAG_START_PX, TOUCH_DRAG_START_PX, clampOffset, readOffset, saveOffset, type Home, type Offset } from './floating';
import { useContactHandler } from '../../hooks/useContactHandler';
import { ContactModal } from '../ContactModal';
import { WhatsAppIcon } from '../ContactButton';
import { telHref, whatsAppHref } from '../../utils/phone';
import { lazyOptional } from '../../utils/lazyOptional';

/**
 * LT-302 — Lighty, the site's assistant, for subscribers' sites. A visitor
 * asks about the business (answered by the server from the site's public
 * data only) or reports a problem with the site, which reaches the Lightor
 * team. The page's visitor pass (Turnstile, usually invisible) is asked for
 * on the first message, as the contact form does.
 * LT-312: on a Plus site he takes the contact button's corner — its call and
 * WhatsApp sit in his chat's header — and he is the 3D Lighty himself, who can
 * be dragged anywhere and throws a tantrum in the air while he is held, as in
 * the dashboard. His picture stands in until three.js and the model have
 * loaded, after the page (and for good with reduced motion or Save-Data).
 */

// A chunk that fails to load leaves his picture in place (LT-315): the 3D
// Lighty is a nicety, and his chat — with its call and WhatsApp — must not
// go down with it.
const SiteLighty3D = lazyOptional(() => import('./SiteLighty3D'));

const IMG = '/lighty-support.webp';
const PASS_WAIT_MS = 15000;
const TEASER_KEY = 'lighty.teaser.shown';
const MESSAGE_MAX = 400;

type Mode = 'chat' | 'report' | 'reported';

interface SiteLightyProps {
  businessName: string;
  /** A leads site has no calendar; its suggestions point to the contact form. */
  leadsSite: boolean;
  /** The business's phone: call and WhatsApp in the chat's header. */
  phone?: string;
  /**
   * LT-387: the register wizard's preview, before the site exists. He looks
   * and moves as on the live site; his chat tells the owner what he will do,
   * a suggestion gets a canned answer, and nothing goes to the server.
   */
  demo?: boolean;
}

/** Load the 3D button only when it costs the visitor nothing they asked for. */
const lightMode = (): boolean =>
  reducedMotion() || (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;


const subdomainOf = (): string => window.location.hostname.split('.')[0];

function Reply({ text, onSection }: { text: string; onSection: (section: string) => void }) {
  return (
    <>
      {replyParts(text).map((part, i) =>
        part.kind === 'bold' ? <strong key={i}>{part.text}</strong>
          : part.kind === 'link' ? (
            <button key={i} type="button" onClick={() => onSection(part.section)} className="underline underline-offset-2 font-semibold text-primary-readable dark:text-primary-dark-readable">
              {part.text}
            </button>
          ) : <span key={i}>{part.text}</span>
      )}
    </>
  );
}

export default function SiteLighty({ businessName, leadsSite, phone, demo = false }: SiteLightyProps) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('chat');
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [wantsPass, setWantsPass] = useState(false);
  const hasPass = useVisitorPass();
  const [model3d, setModel3d] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [report, setReport] = useState({ message: '', contact: '' });
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const still = reducedMotion();
  const { isModalOpen, setIsModalOpen, modalType, handleContactClick } = useContactHandler();
  // A landline has no WhatsApp (LT-404): the header keeps only the call.
  const waHref = whatsAppHref(phone);

  // ── The 3D button (LT-312): after the page, never in its way ───────────
  const [load3d, setLoad3d] = useState(false);
  const [button3d, setButton3d] = useState(false);
  const [waveKey, setWaveKey] = useState(0);
  useEffect(() => {
    if (lightMode()) return;
    let idle = 0;
    let timer = 0;
    const go = () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (ric) idle = ric(() => setLoad3d(true), { timeout: 3000 });
      else timer = window.setTimeout(() => setLoad3d(true), 1500);
    };
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
    return () => {
      window.removeEventListener('load', go);
      window.clearTimeout(timer);
      (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idle);
    };
  }, []);

  // ── Dragging (LT-312, as the dashboard's LT-292) ───────────────────────
  const wrapRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState<Offset>(readOffset);
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  const [dragging, setDragging] = useState(false);
  const [leftHalf, setLeftHalf] = useState(false);
  const press = useRef<{ id: number; x: number; y: number; from: Offset; home: Home; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const homeOf = (): Home | null => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r || !r.width) return null;
    return { left: r.left - offsetRef.current.x, top: r.top - offsetRef.current.y, width: r.width, height: r.height };
  };
  // A smaller window keeps him on screen — and so does a place saved on a bigger one.
  useEffect(() => {
    const onResize = () => {
      const home = homeOf();
      if (home) setOffset((o) => clampOffset(home, o.x, o.y, window.innerWidth, window.innerHeight));
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // Which half he is on: his hello and his chat open on that side.
  useLayoutEffect(() => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (r && r.width) setLeftHalf(r.left + r.width / 2 < window.innerWidth / 2);
  }, [offset, open]);
  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const home = homeOf();
    if (!home) return;
    press.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: offsetRef.current, home, moved: false };
    if (!lightMode()) setLoad3d(true);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (!p || e.pointerId !== p.id) return;
    // A press released just off him never reached onPointerEnd (LT-315): a
    // mouse moving with no button down is not holding him any more.
    if (e.pointerType === 'mouse' && e.buttons === 0) {
      onPointerEnd(e);
      return;
    }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (!p.moved) {
      if (Math.hypot(dx, dy) < (e.pointerType === 'touch' ? TOUCH_DRAG_START_PX : DRAG_START_PX)) return;
      p.moved = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setDragging(true);
      setTeaser(false);
    }
    setOffset(clampOffset(p.home, p.from.x + dx, p.from.y + dy, window.innerWidth, window.innerHeight));
  };
  const onPointerEnd = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (!p || e.pointerId !== p.id) return;
    press.current = null;
    if (!p.moved) return;
    // The click that follows is the drop, not a tap — when one follows at all:
    // a touch drag fires none, and the next real tap must not be swallowed.
    justDragged.current = true;
    window.setTimeout(() => { justDragged.current = false; }, 100);
    setDragging(false);
    saveOffset(offsetRef.current);
  };

  // A hello beside the button, once a session, a few seconds in. The demo
  // says it on every preview, sooner: that is where the owner meets him.
  useEffect(() => {
    let shown = false;
    try { shown = !demo && sessionStorage.getItem(TEASER_KEY) === '1'; } catch { /* private mode */ }
    if (shown) return;
    const show = window.setTimeout(() => {
      setTeaser(true);
      setWaveKey((k) => k + 1);
      if (!demo) try { sessionStorage.setItem(TEASER_KEY, '1'); } catch { /* private mode */ }
    }, demo ? 2500 : 4000);
    const hide = window.setTimeout(() => setTeaser(false), demo ? 12000 : 11000);
    return () => { window.clearTimeout(show); window.clearTimeout(hide); };
  }, [demo]);

  useEffect(() => {
    // The button's 3D Lighty and the chat's take turns; each one's picture stands in until it reloads.
    if (open) setButton3d(false);
    else { setModel3d(false); return; }
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight, behavior: still ? 'auto' : 'smooth' });
  }, [turns, busy, mode, still]);

  const openChat = () => {
    setTeaser(false);
    setOpen(true);
    // A phone's keyboard would cover the chat before the visitor reads it.
    if (window.matchMedia?.('(pointer: fine)').matches) window.setTimeout(() => inputRef.current?.focus(), 150);
  };

  const goToSection = (section: string) => {
    const el = sectionOf(`#${section}`);
    if (!el) return;
    // On a phone the chat covers the page: get out of the way first.
    if (window.innerWidth < 640) setOpen(false);
    scrollToSection(el);
  };

  /** The visitor pass, asked for once; an expired one is asked for again. */
  const withPass = async <T extends { ok: boolean; status?: number }>(call: () => Promise<T>): Promise<T | null> => {
    setWantsPass(true);
    if (!(await visitorPass.wait(PASS_WAIT_MS))) return null;
    let res = await call();
    if (!res.ok && res.status === 401) {
      visitorPass.invalidate();
      if (!(await visitorPass.wait(PASS_WAIT_MS))) return null;
      res = await call();
    }
    return res;
  };

  const ask = async (text: string) => {
    const message = text.trim().slice(0, MESSAGE_MAX);
    if (!message || busy) return;
    if (demo) {
      setTurns((now) => [...now, { role: 'user', text: message }, { role: 'assistant', text: t('assistant.demo.reply') }]);
      return;
    }
    const history = turns;
    setTurns([...history, { role: 'user', text: message }]);
    setInput('');
    setNotice(null);
    setBusy(true);
    try {
      const res = await withPass(() => siteAssistantService.ask(subdomainOf(), message, history, language));
      if (!res) setNotice(t('assistant.error.verify'));
      else if (res.ok && res.reply) setTurns((now) => [...now, { role: 'assistant', text: res.reply as string }]);
      else if (res.status === 429 || res.status === 503) setNotice(t('assistant.error.resting'));
      else setNotice(t('assistant.error.generic'));
    } finally {
      setBusy(false);
    }
  };

  const sendReport = async (e: FormEvent) => {
    e.preventDefault();
    const message = report.message.trim();
    if (message.length < 5 || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await withPass(() => siteAssistantService.report(subdomainOf(), {
        message,
        ...(report.contact.trim() ? { contact: report.contact.trim() } : {}),
        pageUrl: window.location.href.slice(0, 300),
        language,
      }));
      if (res?.ok) {
        setMode('reported');
        setReport({ message: '', contact: '' });
      } else {
        setNotice(res?.status === 429 ? t('assistant.report.limit') : !res ? t('assistant.error.verify') : t('assistant.error.generic'));
      }
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void ask(input);
    }
  };

  const suggestions = leadsSite
    ? [t('assistant.suggest.services'), t('assistant.suggest.hours'), t('assistant.suggest.contact')]
    : [t('assistant.suggest.prices'), t('assistant.suggest.hours'), t('assistant.suggest.book')];
  // The demo keeps offering the ones not tried yet.
  const offered = demo ? suggestions.filter((s) => !turns.some((turn) => turn.role === 'user' && turn.text === s)) : suggestions;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            role="dialog"
            aria-label={t('assistant.title')}
            initial={still ? false : { opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={still ? undefined : { opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed z-[60] bottom-3 inset-x-3 sm:inset-x-auto ${leftHalf ? 'sm:left-4' : 'sm:right-4'} sm:bottom-4 sm:w-[360px] flex flex-col max-h-[min(600px,82vh)] rounded-2xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text`}
          >
            {/* Over the accessibility button (z-50, later in the page), which sat
                on a phone's input row while the chat is open (LT-387). */}
            {/* Lighty himself: 3D once loaded, his picture until then (and for good with reduced motion). */}
            <div className="relative flex items-end gap-3 px-4 pt-3 pb-2 bg-primary/10 dark:bg-primary-dark/15">
              <div className="relative w-20 h-20 shrink-0">
                {!model3d && <img src={IMG} alt="" className="absolute inset-0 w-full h-full object-contain" draggable={false} />}
                {!still && (
                  <Suspense fallback={null}>
                    <SiteLighty3D talking={busy} greet onReady={() => setModel3d(true)} className="absolute -inset-2" />
                  </Suspense>
                )}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <p className="font-bold leading-tight">{t('assistant.title')}</p>
                <p className="text-xs opacity-70 truncate">{t('assistant.subtitle', { name: businessName })}</p>
              </div>
              <div className="self-start flex items-center gap-0.5">
                {/* The contact button's call and WhatsApp, which Lighty's corner replaces (LT-312). */}
                {phone && (
                  <>
                    <button type="button" onClick={() => handleContactClick('phone', telHref(phone))} className="p-1.5 rounded-full text-emerald-600 dark:text-emerald-400 hover:bg-black/5 dark:hover:bg-white/10" aria-label={t('contact.option.call')}>
                      <Phone className="w-[18px] h-[18px]" aria-hidden="true" />
                    </button>
                    {waHref && (
                      <button type="button" onClick={() => handleContactClick('whatsapp', waHref)} className="p-1.5 rounded-full text-[#25D366] hover:bg-black/5 dark:hover:bg-white/10" aria-label={t('contact.option.whatsapp')}>
                        <WhatsAppIcon />
                      </button>
                    )}
                  </>
                )}
                <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10" aria-label={t('assistant.close')}>
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 text-sm" aria-live="polite">
              {mode === 'chat' && (
                <>
                  <div className="max-w-[88%] rounded-2xl rounded-ss-sm px-3 py-2 bg-black/5 dark:bg-white/10">
                    {demo
                      ? t(leadsSite ? 'assistant.demo.helloLeads' : 'assistant.demo.hello', { name: businessName })
                      : t('assistant.hello', { name: businessName })}
                  </div>
                  {!demo && <p className="text-[11px] opacity-55 px-1">{t('assistant.disclaimer')}</p>}
                  {turns.map((turn, i) => (
                    <div
                      key={i}
                      className={turn.role === 'user'
                        ? 'ms-auto max-w-[85%] w-fit rounded-2xl rounded-se-sm px-3 py-2 bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark whitespace-pre-wrap break-words'
                        : 'max-w-[88%] w-fit rounded-2xl rounded-ss-sm px-3 py-2 bg-black/5 dark:bg-white/10 whitespace-pre-wrap break-words'}
                    >
                      {turn.role === 'assistant' ? <Reply text={turn.text} onSection={goToSection} /> : turn.text}
                    </div>
                  ))}
                  {busy && (
                    <div className="w-fit rounded-2xl px-3 py-2.5 bg-black/5 dark:bg-white/10 flex gap-1" role="status" aria-label={t('assistant.typing')}>
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="block w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  )}
                  {(demo ? offered.length > 0 : !turns.length) && !busy && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {offered.map((s) => (
                        <button key={s} type="button" onClick={() => void ask(s)} className="px-3 py-1.5 rounded-full text-xs border border-primary/40 dark:border-primary-dark/40 hover:bg-primary/10 dark:hover:bg-primary-dark/15">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {mode === 'report' && (
                <form onSubmit={sendReport} className="space-y-2.5" id="lighty-report">
                  <p className="text-sm opacity-80">{t('assistant.report.intro')}</p>
                  <textarea
                    value={report.message}
                    onChange={(e) => setReport((r) => ({ ...r, message: e.target.value.slice(0, 1000) }))}
                    rows={4}
                    required
                    minLength={5}
                    aria-label={t('assistant.report.message')}
                    placeholder={t('assistant.report.message')}
                    className="w-full rounded-xl border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    value={report.contact}
                    onChange={(e) => setReport((r) => ({ ...r, contact: e.target.value.slice(0, 120) }))}
                    aria-label={t('assistant.report.contact')}
                    placeholder={t('assistant.report.contact')}
                    className="w-full rounded-xl border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button type="submit" disabled={busy || report.message.trim().length < 5} className="w-full py-2.5 rounded-xl font-semibold bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark disabled:opacity-50">
                    {busy ? t('assistant.sending') : t('assistant.report.send')}
                  </button>
                </form>
              )}

              {mode === 'reported' && (
                <div className="rounded-2xl px-3 py-3 bg-black/5 dark:bg-white/10">{t('assistant.report.thanks')}</div>
              )}

              {notice && <p className="text-xs text-red-600 dark:text-red-400" role="alert">{notice}</p>}

              {/* The visitor check: once, only when there is no pass yet. Usually invisible. */}
              {wantsPass && !hasPass && (
                <div className="flex justify-center" data-testid="lighty-turnstile">
                  <Turnstile
                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                    onSuccess={(token) => void visitorPass.handshake(token)}
                    options={{ theme: 'auto', size: 'flexible', appearance: 'interaction-only' }}
                  />
                </div>
              )}
            </div>

            <div className="border-t border-black/10 dark:border-white/10 px-3 pt-2 pb-2.5">
              {mode === 'chat' ? (
                <form onSubmit={(e) => { e.preventDefault(); void ask(input); }} className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, MESSAGE_MAX))}
                    onKeyDown={onKeyDown}
                    rows={1}
                    maxLength={MESSAGE_MAX}
                    disabled={demo}
                    placeholder={demo ? t('assistant.demo.input') : t('assistant.placeholder')}
                    aria-label={demo ? t('assistant.demo.input') : t('assistant.placeholder')}
                    className="flex-1 min-w-0 max-h-24 resize-none rounded-xl border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 [field-sizing:content]"
                  />
                  <button type="submit" disabled={busy || !input.trim()} aria-label={t('assistant.send')} className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark disabled:opacity-40">
                    <Send className="w-4 h-4 rtl:-scale-x-100" aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <button type="button" onClick={() => { setMode('chat'); setNotice(null); }} className="inline-flex items-center gap-1.5 text-xs font-semibold opacity-80 hover:opacity-100">
                  <ArrowLeft className="w-3.5 h-3.5 rtl:-scale-x-100" aria-hidden="true" />
                  {t('assistant.back')}
                </button>
              )}
              {mode === 'chat' && !demo && (
                <button type="button" onClick={() => { setMode('report'); setNotice(null); }} className="mt-1.5 inline-flex items-center gap-1.5 text-xs opacity-70 hover:opacity-100">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('assistant.report.open')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The corner: Lighty himself, dragged anywhere (LT-312). */}
      <div
        ref={wrapRef}
        className="fixed bottom-3 end-3 z-50"
        style={offset.x || offset.y ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : undefined}
        data-testid="site-lighty"
      >
        {!open && (
          <>
            <AnimatePresence>
              {teaser && !dragging && (
                <motion.button
                  key="teaser"
                  type="button"
                  onClick={openChat}
                  initial={still ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={still ? undefined : { opacity: 0, y: 6 }}
                  className={`absolute bottom-[5.75rem] ${leftHalf ? 'left-1 rounded-bl-sm' : 'right-1 rounded-br-sm'} w-max max-w-[220px] px-3.5 py-2 rounded-2xl shadow-lg text-sm font-semibold bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text border border-black/10 dark:border-white/10`}
                >
                  {t('assistant.teaser')}
                </motion.button>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => {
                if (justDragged.current) { justDragged.current = false; return; }
                openChat();
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              aria-label={t('assistant.open')}
              className={`relative block w-20 h-24 select-none touch-none rounded-2xl transition-transform duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 [filter:drop-shadow(0_6px_10px_rgba(0,0,0,0.25))] ${dragging ? 'scale-110 cursor-grabbing' : 'hover:scale-105 active:scale-95 cursor-grab'}`}
            >
              {!button3d && (
                <motion.img
                  src={IMG}
                  alt=""
                  draggable={false}
                  className="absolute inset-x-0 bottom-0 w-20 h-20 object-contain pointer-events-none"
                  // Held before the 3D has arrived (or never will): a wriggle stands in for the tantrum.
                  animate={dragging && !still ? { rotate: [-10, 10] } : { rotate: 0 }}
                  transition={dragging && !still ? { duration: 0.18, repeat: Infinity, repeatType: 'mirror' } : { duration: 0.2 }}
                />
              )}
              {load3d && (
                <Suspense fallback={null}>
                  <SiteLighty3D dragging={dragging} waveKey={waveKey} onReady={() => setButton3d(true)} className="absolute -inset-3 pointer-events-none" />
                </Suspense>
              )}
            </button>
          </>
        )}
      </div>

      {phone && (
        <ContactModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          contactLink={modalType === 'whatsapp' && waHref ? waHref : telHref(phone)}
          type={modalType}
        />
      )}
    </>
  );
}

import { useSyncExternalStore } from 'react';
import AuthService from './AuthService';

/**
 * The page's visitor pass (LT-199, G1).
 *
 * The API accepts a booking or a contact-form message only with a visitor
 * pass: a 60-minute cookie the server sets after a Cloudflare Turnstile
 * handshake. The handshake used to live inside the booking section, so a page
 * without a calendar — every leads site, and any site with no service — could
 * never send its contact form (401).
 *
 * One store for the page, shared by every form that needs the pass: the
 * booking section hands its Turnstile token here on mount, as it always did;
 * the contact form renders its own Turnstile only when no pass exists yet,
 * and waits here for one before it sends.
 */

let hasPass = false;
let inflight: Promise<boolean> | null = null;
const listeners = new Set<() => void>();
const waiters = new Set<(ok: boolean) => void>();

const set = (value: boolean) => {
  if (hasPass === value) return;
  hasPass = value;
  listeners.forEach((listener) => listener());
  if (value) {
    waiters.forEach((resolve) => resolve(true));
    waiters.clear();
  }
};

export const visitorPass = {
  has: (): boolean => hasPass,

  /** Hand a Turnstile token to the server. Concurrent calls share one handshake. */
  handshake(token: string): Promise<boolean> {
    if (hasPass) return Promise.resolve(true);
    if (inflight) return inflight;
    inflight = AuthService.handshake(token)
      .then((ok) => {
        if (ok) set(true);
        return ok;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },

  /** The server refused the pass (it lives an hour): the next form asks again. */
  invalidate(): void {
    set(false);
  },

  /** Resolves true once a pass exists, false after `timeoutMs` without one. */
  wait(timeoutMs: number): Promise<boolean> {
    if (hasPass) return Promise.resolve(true);
    return new Promise((resolve) => {
      const done = (ok: boolean) => {
        clearTimeout(timer);
        waiters.delete(done);
        resolve(ok);
      };
      const timer = setTimeout(() => done(false), timeoutMs);
      waiters.add(done);
    });
  },
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Whether this page holds a visitor pass; re-renders when that changes. */
export const useVisitorPass = (): boolean => useSyncExternalStore(subscribe, () => hasPass, () => hasPass);

/** Test hook: a fresh page. */
export const resetVisitorPassForTests = (): void => {
  hasPass = false;
  inflight = null;
  waiters.clear();
  listeners.forEach((listener) => listener());
};

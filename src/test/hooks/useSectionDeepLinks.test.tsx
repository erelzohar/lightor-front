import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useSectionDeepLinks } from '../../hooks/useSectionDeepLinks';
import { sectionOf } from '../../utils/sections';

function Page({ ready = true }: { ready?: boolean }) {
  useSectionDeepLinks(ready);
  return (
    <main>
      <section id="about">about</section>
      <section id="schedule">schedule</section>
    </main>
  );
}

/** Where each section sits on the page, as the browser would measure it. */
const placeAt = (id: string, top: number) => {
  const el = document.getElementById(id)!;
  el.getBoundingClientRect = () => ({ top, bottom: top + 400, left: 0, right: 0, width: 0, height: 400, x: 0, y: top, toJSON: () => ({}) });
};

let scrollTo: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  document.documentElement.style.setProperty('--nav-offset', '88px');
});
afterEach(() => {
  vi.useRealTimers();
  scrollTo.mockRestore();
  document.documentElement.style.removeProperty('--nav-offset');
  window.history.replaceState(null, '', '/');
});

const mount = (hash: string, ready = true) => {
  window.history.replaceState(null, '', `/${hash}`);
  const view = render(<Page ready={ready} />);
  placeAt('about', 900);
  placeAt('schedule', 3350);
  return view;
};

/**
 * LT-222 — `https://<site>/#schedule` lands on the schedule section. The
 * browser's own jump ran before React drew any section, so a shared section
 * link opened the page at its top.
 */
describe('section deep links', () => {
  it('brings the named section under the navbar once the site is drawn', () => {
    mount('#schedule');
    vi.advanceTimersByTime(0);
    expect(scrollTo).toHaveBeenCalledWith({ top: 3350 - 88, behavior: 'auto' });
  });

  it('keeps it there while the page settles, until the visitor scrolls', () => {
    mount('#schedule');
    vi.advanceTimersByTime(700);
    const aligned = scrollTo.mock.calls.length;
    expect(aligned).toBeGreaterThan(1);
    fireEvent.wheel(window);
    vi.advanceTimersByTime(5000);
    expect(scrollTo.mock.calls.length).toBe(aligned);
  });

  it('does nothing without a hash, for an unknown one, or before the site is drawn', () => {
    mount('');
    vi.advanceTimersByTime(5000);
    mount('#nowhere');
    vi.advanceTimersByTime(5000);
    mount('#schedule', false);
    vi.advanceTimersByTime(5000);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('follows a later change of the hash, smoothly', () => {
    mount('');
    window.history.replaceState(null, '', '/#about');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(scrollTo).toHaveBeenCalledWith({ top: 900 - 88, behavior: 'smooth' });
  });

  it('looks a fragment up as an id, never as a selector', () => {
    render(<Page />);
    expect(sectionOf('#schedule')?.id).toBe('schedule');
    expect(sectionOf('schedule')?.id).toBe('schedule');
    expect(sectionOf('#1[x]')).toBeNull(); // would throw as a selector
    expect(sectionOf('#%E0%A4%A')).toBeNull(); // a malformed escape
    expect(sectionOf('')).toBeNull();
  });
});

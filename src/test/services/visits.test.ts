import { describe, it, expect, vi, beforeEach } from 'vitest';
import { countsHere, noteProductView, noteVisit, resetVisitMemory, VISIT_GAP_MS } from '../../services/visits';

/**
 * LT-569: a visit is the visitor coming in - the pages of the next half
 * hour are the same visit - and a product is counted once a half hour; never
 * from a frame (the editor, the wizard's preview) or a robot browser.
 */
const fetchMock = vi.fn(async (url: string, init?: RequestInit) => { void url; void init; return new Response(null, { status: 204 }); });
const sent = () => fetchMock.mock.calls.map(([url, init]) => ({ url: String(url), body: JSON.parse(String((init as RequestInit).body)) }));
const T = 1_800_000_000_000;

describe('counting visits (LT-569)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockClear();
    localStorage.clear();
    resetVisitMemory();
  });

  it('counts the first page, then the pages of the next half hour as the same visit', () => {
    expect(noteVisit('dana', T)).toBe(true);
    expect(noteVisit('dana', T + 10 * 60_000)).toBe(false);
    // Each page moves the half hour on: still the same visit 35 minutes in.
    expect(noteVisit('dana', T + 35 * 60_000)).toBe(false);
    // Back after more than half an hour away: a new visit.
    expect(noteVisit('dana', T + 35 * 60_000 + VISIT_GAP_MS + 1)).toBe(true);
    expect(sent()).toEqual([
      { url: expect.stringMatching(/\/api\/visits\/dana$/), body: {} },
      { url: expect.stringMatching(/\/api\/visits\/dana$/), body: {} },
    ]);
  });

  it('keeps only the time on the device, nothing about the visitor', () => {
    noteVisit('dana', T);
    expect(Object.keys(localStorage)).toEqual(['lt.visit.dana']);
    expect(localStorage.getItem('lt.visit.dana')).toBe(String(T));
  });

  it('counts each product once a half hour', () => {
    expect(noteProductView('dana', 'p1', T)).toBe(true);
    expect(noteProductView('dana', 'p1', T + 60_000)).toBe(false);
    expect(noteProductView('dana', 'p2', T + 60_000)).toBe(true);
    expect(noteProductView('dana', 'p1', T + VISIT_GAP_MS + 1)).toBe(true);
    expect(sent().map((s) => s.body)).toEqual([{ product: 'p1' }, { product: 'p2' }, { product: 'p1' }]);
    // The products of more than half an hour ago are dropped from the device.
    noteProductView('dana', 'p3', T + 3 * VISIT_GAP_MS);
    expect(Object.keys(JSON.parse(localStorage.getItem('lt.viewed.dana') ?? '{}'))).toEqual(['p3']);
  });

  it('counts once a page load when the device keeps nothing', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(noteVisit('dana', T)).toBe(true);
    expect(noteVisit('dana', T + 1000)).toBe(false);
    set.mockRestore();
  });

  it('never counts inside a frame or from a robot browser', () => {
    const top = {} as Window;
    expect(countsHere({ self: top, top, navigator: { webdriver: false } as Navigator })).toBe(true);
    expect(countsHere({ self: {} as Window, top, navigator: { webdriver: false } as Navigator })).toBe(false);
    expect(countsHere({ self: top, top, navigator: { webdriver: true } as Navigator })).toBe(false);
  });
});

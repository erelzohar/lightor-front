import { describe, it, expect, vi, beforeEach, afterEach, onTestFinished } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';
import { LanguageProvider } from '../../contexts/LanguageContext';
import '../../i18n/config';
import { stubLocation } from '../helpers/location';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

/**
 * LT-243 — the site editor's bridge on the public site: the dashboard posts
 * the draft and `LT_EDIT`, the page marks every editable text, image and
 * section with its config path, and a click comes back as `LT_SELECT` (and
 * goes nowhere else).
 */

const DASHBOARD = 'https://dashboard.lightor.app';

const post = (data: unknown, origin = DASHBOARD) =>
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, origin }));
  });

const config = (over: Record<string, unknown> = {}) => ({
  ...RAW_AI_RESPONSE_SHAPE,
  components: {
    ...RAW_AI_RESPONSE_SHAPE.components,
    hero: { ...RAW_AI_RESPONSE_SHAPE.components.hero, title: 'Sharp cuts', subtitle: 'Since 1999', cta: 'Book now' },
    faq: { visible: true, title: 'FAQ', items: [{ question: 'Parking?', answer: 'Out back' }] },
  },
  appointmentTypes: [{ _id: 'svc1', name: 'Haircut', price: '80', durationMS: '1800000', webConfig_id: 'w', user_id: 'u' }],
  ...over,
});

describe('the site editor bridge (LT-243)', () => {
  let parentPost: ReturnType<typeof vi.fn>;
  const realParent = window.parent;

  beforeEach(() => {
    // jsdom has none of these; the page's theme and in-view reveals use them.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
    class Observer { observe() {} unobserve() {} disconnect() {} takeRecords(): unknown[] { return []; } }
    vi.stubGlobal('IntersectionObserver', Observer);
    vi.stubGlobal('ResizeObserver', Observer);
    stubLocation('https://test-barber.lightor.app/?preview');
    parentPost = vi.fn();
    Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage: parentPost } });
  });
  afterEach(() => {
    Object.defineProperty(window, 'parent', { configurable: true, value: realParent });
    vi.unstubAllGlobals();
  });

  const renderSite = () =>
    render(
      <MemoryRouter>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </MemoryRouter>
    );

  it("accepts the native app's origins and nothing look-alike", async () => {
    renderSite();
    await post({ type: 'PREVIEW_DATA', config: config({ businessName: 'Evil' }) }, 'https://app.lightor.app.attacker.com');
    expect(screen.queryAllByText('Evil')).toHaveLength(0);

    await post({ type: 'PREVIEW_DATA', config: config({ businessName: 'From iOS' }) }, 'capacitor://app.lightor.app');
    await waitFor(() => expect(screen.getAllByText('From iOS').length).toBeGreaterThan(0));

    await post({ type: 'PREVIEW_DATA', config: config({ businessName: 'From Android' }) }, 'https://app.lightor.app');
    await waitFor(() => expect(screen.getAllByText('From Android').length).toBeGreaterThan(0));
  });

  it('marks nothing until the editor is on, then every field and section by path', async () => {
    const { container } = renderSite();
    await post({ type: 'PREVIEW_DATA', config: config() });
    await waitFor(() => expect(screen.getAllByText('Sharp cuts').length).toBeGreaterThan(0));
    expect(container.querySelector('[data-lt-edit]')).toBeNull();
    expect(container.querySelector('[data-lt-section]')).toBeNull();

    await post({ type: 'LT_EDIT', on: true });
    await waitFor(() => expect(container.querySelector('[data-lt-edit="components.hero.title"]')).not.toBeNull());
    // The title and the subtitle share an <h1> but are separate fields.
    expect(container.querySelector('[data-lt-edit="components.hero.subtitle"]')).not.toBeNull();
    expect(container.querySelector('[data-lt-edit="components.hero.heroImageSrc"][data-lt-kind="image"]')).not.toBeNull();
    expect(container.querySelector('[data-lt-edit="components.faq.items.0.answer"]')).not.toBeNull();
    expect(container.querySelector('[data-lt-edit="businessName"]')).not.toBeNull();
    expect(container.querySelector('[data-lt-section="hero"]')).not.toBeNull();
    expect(container.querySelector('[data-lt-section="navbar"]')).not.toBeNull();
    // In the editor every FAQ answer is open, so it can be pointed at.
    expect(container.querySelector('details')).toHaveAttribute('open');

    await post({ type: 'LT_EDIT', on: false });
    await waitFor(() => expect(container.querySelector('[data-lt-edit]')).toBeNull());
  });

  it("LT-312: the corner by plan - the contact button on a free site, Lighty's picture on a Plus one", async () => {
    const { container } = renderSite();
    const withButton = (over: Record<string, unknown> = {}) =>
      config({ ...over, components: { ...config().components, contactButton: { visible: true } } });
    await post({ type: 'PREVIEW_DATA', config: withButton() });
    await post({ type: 'LT_EDIT', on: true });
    await waitFor(() => expect(container.querySelector('[data-lt-section="contactButton"]')).not.toBeNull());
    expect(screen.queryByTestId('site-lighty-still')).toBeNull();

    await post({ type: 'PREVIEW_DATA', config: withButton({ assistant: true }) });
    await waitFor(() => expect(screen.getByTestId('site-lighty-still')).toBeTruthy());
    expect(container.querySelector('[data-lt-section="contactButton"]')).toBeNull();
    // He talks to visitors on the live site only.
    expect(screen.queryByTestId('site-lighty')).toBeNull();
  });

  it('turns a click into LT_SELECT for the editor, and the click goes nowhere else', async () => {
    const { container } = renderSite();
    await post({ type: 'PREVIEW_DATA', config: config() });
    await post({ type: 'LT_EDIT', on: true });
    const title = await waitFor(() => {
      const el = container.querySelector<HTMLElement>('[data-lt-edit="components.hero.title"]');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    parentPost.mockClear();

    let notCancelled = true;
    act(() => {
      notCancelled = title.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(notCancelled).toBe(false);
    expect(parentPost).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'LT_SELECT', kind: 'text', path: 'components.hero.title', section: 'hero' }),
      DASHBOARD
    );

    // A link (the CTA) is held too: selected, never followed.
    const cta = container.querySelector<HTMLElement>('[data-lt-edit="components.hero.cta"]') as HTMLElement;
    act(() => {
      notCancelled = cta.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(notCancelled).toBe(false);
    expect(parentPost).toHaveBeenLastCalledWith(expect.objectContaining({ path: 'components.hero.cta' }), DASHBOARD);
  });

  it('a second click on a control inside the selection uses it - the dark-mode switch (LT-287)', async () => {
    const { container } = renderSite();
    await post({ type: 'PREVIEW_DATA', config: config() });
    await post({ type: 'LT_EDIT', on: true });
    // The site speaks Hebrew here, so find the switch by its moon/sun icon.
    const toggle = await waitFor(() => {
      const el = container.querySelector<SVGElement>('svg.lucide-moon, svg.lucide-sun')?.closest('button');
      expect(el).toBeTruthy();
      return el as HTMLElement;
    });
    expect(toggle.closest('[data-lt-section]')).not.toBeNull();
    parentPost.mockClear();
    const wasDark = document.documentElement.classList.contains('dark');

    // First click: picks its section for the editor, does nothing on the site.
    let notCancelled = true;
    act(() => { notCancelled = toggle.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); });
    expect(notCancelled).toBe(false);
    expect(parentPost).toHaveBeenCalledWith(expect.objectContaining({ type: 'LT_SELECT', kind: 'section' }), DASHBOARD);
    expect(document.documentElement.classList.contains('dark')).toBe(wasDark);

    // Second click, on what is now selected: it works, and selects nothing new.
    parentPost.mockClear();
    act(() => { notCancelled = toggle.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); });
    expect(notCancelled).toBe(true);
    expect(parentPost).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'LT_SELECT' }), DASHBOARD);
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(!wasDark));
  });

  it("a section's selection lists the fields it shows, once each (LT-249)", async () => {
    const { container } = renderSite();
    await post({ type: 'PREVIEW_DATA', config: config() });
    await post({ type: 'LT_EDIT', on: true });
    const faq = await waitFor(() => {
      const el = container.querySelector<HTMLElement>('[data-lt-section="faq"] section');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    parentPost.mockClear();
    act(() => { faq.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); });
    expect(parentPost).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'LT_SELECT', kind: 'section', section: 'faq',
        fields: [
          { path: 'components.faq.title', kind: 'text' },
          { path: 'components.faq.items.0.question', kind: 'text' },
          { path: 'components.faq.items.0.answer', kind: 'text' },
        ],
      }),
      DASHBOARD
    );
  });

  it('names blocks by id on a composed page, and block copy by its props path', async () => {
    const { container } = renderSite();
    await post({
      type: 'PREVIEW_DATA',
      config: config({
        blocks: [
          { id: 'b1', type: 'hero' },
          { id: 'k7', type: 'manifesto', props: { text: 'We cut with care' } },
          { id: 'b3', type: 'faq' },
        ],
      }),
    });
    await post({ type: 'LT_EDIT', on: true });
    await waitFor(() => expect(container.querySelector('[data-lt-section="k7"]')).not.toBeNull());
    expect(container.querySelector('[data-lt-section="k7"]')).toHaveAttribute('data-lt-section-type', 'manifesto');
    expect(container.querySelector('[data-lt-edit="blocks.k7.props.text"]')).toHaveTextContent('We cut with care');
  });

  it('a hidden section is gone from the site but shows, marked, in the editor (LT-249)', async () => {
    const legacy = config();
    (legacy.components as Record<string, Record<string, unknown>>).faq.visible = false;
    const { container } = renderSite();
    await post({ type: 'PREVIEW_DATA', config: legacy });
    await waitFor(() => expect(screen.getAllByText('Sharp cuts').length).toBeGreaterThan(0));
    expect(screen.queryByText('Parking?')).toBeNull();

    await post({ type: 'LT_EDIT', on: true });
    await waitFor(() => expect(container.querySelector('[data-lt-section="faq"]')).not.toBeNull());
    expect(container.querySelector('[data-lt-section="faq"]')).toHaveAttribute('data-lt-hidden', 'true');
    expect(container.querySelector('[data-lt-section="hero"]')).not.toHaveAttribute('data-lt-hidden');

    // A composed page: the block hidden by the owner, the same way.
    await post({
      type: 'PREVIEW_DATA',
      config: config({ blocks: [{ id: 'b1', type: 'hero' }, { id: 'k7', type: 'manifesto', props: { text: 'Hidden words' }, mod: { hidden: true } }] }),
    });
    await waitFor(() => expect(container.querySelector('[data-lt-section="k7"]')).toHaveAttribute('data-lt-hidden', 'true'));
    await post({ type: 'LT_EDIT', on: false });
    await waitFor(() => expect(screen.queryByText('Hidden words')).toBeNull());
  });

  it('a legacy page tells the editor its sections, in order, as the blocks they would be (LT-252)', async () => {
    const legacy = config({ design: { heroLayout: 'split', aboutLayout: 'wall' } });
    (legacy.components as Record<string, Record<string, unknown>>).faq.visible = false;
    renderSite();
    await post({ type: 'PREVIEW_DATA', config: legacy });
    await waitFor(() => expect(screen.getAllByText('Sharp cuts').length).toBeGreaterThan(0));
    // Nothing while the editor is off.
    expect(parentPost.mock.calls.some(([m]) => m.type === 'LT_LAYOUT')).toBe(false);

    await post({ type: 'LT_EDIT', on: true });
    const blocks = await waitFor(() => {
      const call = parentPost.mock.calls.find(([m]) => m.type === 'LT_LAYOUT');
      expect(call).toBeDefined();
      return call![0].blocks as { key: string; type: string; variant?: string; mod?: Record<string, unknown> }[];
    });
    expect(blocks.map((b) => b.type)).toEqual(['hero', 'intro', 'gallery', 'schedule', 'faq', 'contact', 'footer']);
    // The about section as the composer reads its layout; the hidden FAQ stays, hidden.
    expect(blocks[1]).toEqual({ key: 'about', type: 'intro', variant: 'columns', source: 'about' });
    expect(blocks[4]).toEqual({ key: 'faq', type: 'faq', source: 'faq', mod: { hidden: true } });
    expect(parentPost.mock.calls.find(([m]) => m.type === 'LT_LAYOUT')![1]).toBe(DASHBOARD);

    // A composed page has its blocks already: no layout.
    parentPost.mockClear();
    await post({ type: 'PREVIEW_DATA', config: config({ blocks: [{ id: 'b1', type: 'hero' }, { id: 'b2', type: 'faq' }] }) });
    await waitFor(() => expect(document.querySelector('[data-lt-section="b2"]')).not.toBeNull());
    expect(parentPost.mock.calls.some(([m]) => m.type === 'LT_LAYOUT')).toBe(false);
  });

  it('scrolls to a section that the next draft draws, clear of the navbar (LT-252)', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    onTestFinished(() => { scrollTo.mockRestore(); document.documentElement.style.removeProperty('--nav-offset'); });
    const { container } = renderSite();
    await post({ type: 'PREVIEW_DATA', config: config({ blocks: [{ id: 'b1', type: 'hero' }] }) });
    await post({ type: 'LT_EDIT', on: true });
    scrollTo.mockClear();
    await post({ type: 'LT_SCROLL_TO', section: 'b9', block: 'start' });
    expect(scrollTo).not.toHaveBeenCalled();
    // Where the new section will be drawn, and the bar above it (jsdom lays nothing out).
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
      { top: 900, bottom: 1300, left: 0, right: 0, width: 0, height: 400, x: 0, y: 900, toJSON: () => ({}) } as DOMRect,
    );
    onTestFinished(() => rect.mockRestore());
    document.documentElement.style.setProperty('--nav-offset', '72px');
    await post({ type: 'PREVIEW_DATA', config: config({ blocks: [{ id: 'b1', type: 'hero' }, { id: 'b9', type: 'faq' }] }) });
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ top: 900 - 72, behavior: 'smooth' }));
    expect(container.querySelector('[data-lt-section="b9"]')).not.toBeNull();
  });

  it('ignores editor messages from an untrusted origin', async () => {
    const { container } = renderSite();
    await post({ type: 'PREVIEW_DATA', config: config() });
    await post({ type: 'LT_EDIT', on: true }, 'https://evil.example');
    await waitFor(() => expect(screen.getAllByText('Sharp cuts').length).toBeGreaterThan(0));
    expect(container.querySelector('[data-lt-edit]')).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import App from '../../App';
import { LanguageProvider } from '../../contexts/LanguageContext';
import '../../i18n/config';
import { INLINE_CONFIG_ID } from '../../services/edgeShell';
import { resetSiteForTests } from '../../services/site';
import { stubLocation } from '../helpers/location';
import { RAW_AI_RESPONSE_SHAPE } from '../fixtures/rawAiConfig';

/**
 * LT-661: the whole site on a business's own domain. The host's first label
 * (`www`) names nobody: the site is the one the edge inlined for this host,
 * or the one the API answers for it.
 */
const OWN = 'www.dana-studio.co.il';
const HOST_ROUTE = `https://${OWN}/api/web-configs/host/${OWN}`;
const NAME = RAW_AI_RESPONSE_SHAPE.subDomain;

const config = (businessName: string) => ({
  ...RAW_AI_RESPONSE_SHAPE,
  businessName,
  components: {
    ...RAW_AI_RESPONSE_SHAPE.components,
    hero: { ...RAW_AI_RESPONSE_SHAPE.components.hero, title: `${businessName} title` },
  },
});

const inline = (payload: unknown) => {
  const script = document.createElement('script');
  script.id = INLINE_CONFIG_ID;
  script.setAttribute('type', 'application/json');
  script.textContent = JSON.stringify(payload);
  document.head.appendChild(script);
};

describe("the site on a business's own domain (LT-661)", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
    class Observer { observe() {} unobserve() {} disconnect() {} takeRecords(): unknown[] { return []; } }
    vi.stubGlobal('IntersectionObserver', Observer);
    vi.stubGlobal('ResizeObserver', Observer);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
    mock = new MockAdapter(axios);
    resetSiteForTests();
    stubLocation(`https://${OWN}/`);
  });
  afterEach(() => {
    mock.restore();
    document.getElementById(INLINE_CONFIG_ID)?.remove();
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

  const asked = () => mock.history.get.map((request) => String(request.url));

  it('paints from the config the edge inlined for this host, and refreshes it by the site\'s name', async () => {
    inline({ subDomain: NAME, host: OWN, fetchedAt: '2026-11-15T10:00:00.000Z', config: config('Dana Studio') });
    mock.onGet(new RegExp(`/web-configs/subdomain/${NAME}$`)).reply(200, { success: true, data: config('Dana Studio') });

    renderSite();

    await waitFor(() => expect(screen.getAllByText('Dana Studio title').length).toBeGreaterThan(0));
    await waitFor(() => expect(asked().some((url) => url.endsWith(`/web-configs/subdomain/${NAME}`))).toBe(true));
    expect(asked().some((url) => url.includes('/web-configs/host/'))).toBe(false);
    expect(asked().some((url) => url.endsWith('/subdomain/www'))).toBe(false);
  });

  it('asks the API which site this host is when the edge inlined nothing, in one call', async () => {
    mock.onGet(HOST_ROUTE).reply(200, { success: true, data: config('Dana Studio') });

    renderSite();

    await waitFor(() => expect(screen.getAllByText('Dana Studio title').length).toBeGreaterThan(0));
    expect(asked()).toEqual([HOST_ROUTE]);
    expect(document.title).toBe('Dana Studio');
  });

  it('does not paint a config inlined for another host', async () => {
    inline({ subDomain: 'someone-else', host: 'www.another-business.com', config: config('Someone Else') });
    mock.onGet(HOST_ROUTE).reply(200, { success: true, data: config('Dana Studio') });

    renderSite();

    await waitFor(() => expect(screen.getAllByText('Dana Studio title').length).toBeGreaterThan(0));
    expect(screen.queryAllByText('Someone Else title')).toHaveLength(0);
    expect(asked()).toEqual([HOST_ROUTE]);
  });

  it('shows the not-found page when no site answers for this host', async () => {
    mock.onGet(HOST_ROUTE).reply(404, { success: false });

    const { container } = renderSite();

    await waitFor(() => expect(asked()).toEqual([HOST_ROUTE]));
    await waitFor(() => expect(container.textContent).toContain('404'));
    expect(asked().some((url) => url.includes('/subdomain/'))).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { INLINE_CONFIG_ID } from '../../services/edgeShell';
import {
  apiRoot,
  isLightorHost,
  onOutsideHost,
  outsideHostConfig,
  resetSiteForTests,
  siteName,
  siteNameNow,
  withSiteName,
} from '../../services/site';
import { stubLocation } from '../helpers/location';

/**
 * LT-661: a site on a business's own domain. The host's first label names
 * the site only on a Lightor host; elsewhere the edge's inlined config does,
 * or the API's by-host route, asked once. The API is the page's own origin
 * there, so the visitor pass stays a first-party cookie.
 */
const OWN = 'www.dana-studio.co.il';
const HOST_ROUTE = `https://${OWN}/api/web-configs/host/${OWN}`;

const inline = (payload: unknown) => {
  const script = document.createElement('script');
  script.id = INLINE_CONFIG_ID;
  script.setAttribute('type', 'application/json');
  script.textContent = JSON.stringify(payload);
  document.head.appendChild(script);
};

describe('the kind of host (LT-661)', () => {
  it('knows a Lightor host: the zone, a developer machine, an address', () => {
    for (const host of [
      'dana.lightor.app', 'lightor.app', 'DANA.Lightor.App', 'dana.lightor.app.',
      'localhost', 'dana.localhost', '127.0.0.1', '192.168.1.20', '[::1]', 'my-mac', '',
    ]) {
      expect(isLightorHost(host), host).toBe(true);
    }
  });

  it('knows an outside host, look-alikes included', () => {
    for (const host of [
      OWN, 'dana-studio.co.il', 'lt-test.ez-lines.com', 'xn--4dbrk0ce.co.il',
      'evil-lightor.app', 'dana.lightor.app.attacker.com', 'lightor.app.co', 'notlocalhost.com',
    ]) {
      expect(isLightorHost(host), host).toBe(false);
    }
  });

  it('reads the kind of the page it is on', () => {
    stubLocation('https://dana.lightor.app/');
    expect(onOutsideHost()).toBe(false);
    stubLocation(`https://${OWN}/blog`);
    expect(onOutsideHost()).toBe(true);
  });
});

describe('the API root (LT-661)', () => {
  it("is the API's own address on a Lightor host, as always", () => {
    const lightor = { hostname: 'dana.lightor.app', origin: 'https://dana.lightor.app' };
    expect(apiRoot(lightor, true)).toBe('https://api.lightor.app/api');
    expect(apiRoot(lightor, false)).toBe('http://localhost:3000/api');
    expect(apiRoot({ hostname: 'localhost', origin: 'http://localhost:5173' }, false)).toBe('http://localhost:3000/api');
  });

  it("is the page's own origin on an outside host", () => {
    const own = { hostname: OWN, origin: `https://${OWN}` };
    expect(apiRoot(own, true)).toBe(`https://${OWN}/api`);
    expect(apiRoot(own, false)).toBe(`https://${OWN}/api`);
  });

  it('reads the page it is on', () => {
    stubLocation(`https://${OWN}/`);
    expect(apiRoot()).toBe(`https://${OWN}/api`);
    stubLocation('http://dana.localhost:5173/');
    expect(apiRoot()).toBe('http://localhost:3000/api');
  });

  it('puts every address, the images included, under it', async () => {
    vi.resetModules();
    stubLocation(`https://${OWN}/`);
    const { default: globals } = await import('../../services/globals');
    expect(globals).toMatchObject({
      appointmentsUrl: `https://${OWN}/api/appointments`,
      webConfigsUrl: `https://${OWN}/api/web-configs`,
      messagingUrl: `https://${OWN}/api/messaging`,
      siteAssistantUrl: `https://${OWN}/api/site-assistant`,
      visitsUrl: `https://${OWN}/api/visits`,
      imagesUrl: `https://${OWN}/api/images/`,
      authUrl: `https://${OWN}/api/auth/`,
    });
    const { default: ImagesService } = await import('../../services/ImagesService');
    expect(ImagesService.getInstance().getImage('logo.webp')).toBe(`https://${OWN}/api/images/logo.webp`);
    // A stored absolute address is left as it is.
    expect(ImagesService.getInstance().getImage('https://images.example.com/a.jpg')).toBe('https://images.example.com/a.jpg');

    vi.resetModules();
    stubLocation('https://dana.lightor.app/');
    const { default: onLightor } = await import('../../services/globals');
    expect(onLightor).toMatchObject({
      appointmentsUrl: 'http://localhost:3000/api/appointments',
      imagesUrl: 'http://localhost:3000/api/images/',
      authUrl: 'http://localhost:3000/api/auth/',
    });
  });
});

describe("the site's name (LT-661)", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    resetSiteForTests();
  });
  afterEach(() => {
    mock.restore();
    document.getElementById(INLINE_CONFIG_ID)?.remove();
  });

  it("is the host's first label on a Lightor host, at once and without the API", async () => {
    stubLocation('https://dana.lightor.app/products');
    expect(siteNameNow()).toBe('dana');
    await expect(siteName()).resolves.toBe('dana');

    stubLocation('http://studio-ora.localhost:5173/');
    expect(siteNameNow()).toBe('studio-ora');
    stubLocation('http://localhost:5173/');
    expect(siteNameNow()).toBe('localhost');

    // The inlined config never renames a Lightor host.
    inline({ subDomain: 'other', host: 'dana.lightor.app', config: {} });
    stubLocation('https://dana.lightor.app/');
    expect(siteNameNow()).toBe('dana');
    expect(mock.history.get).toHaveLength(0);
  });

  it('runs a call at once on a Lightor host', () => {
    stubLocation('https://dana.lightor.app/');
    const call = vi.fn(async (name: string) => name.toUpperCase());
    const answer = withSiteName(call);
    expect(call).toHaveBeenCalledWith('dana');
    return expect(answer).resolves.toBe('DANA');
  });

  it('comes from the inlined config on an outside host, when it is for this host', async () => {
    stubLocation(`https://${OWN}/`);
    inline({ subDomain: 'dana', host: OWN, fetchedAt: '2026-11-15T10:00:00.000Z', config: { businessName: 'Dana' } });
    expect(siteNameNow()).toBe('dana');
    await expect(siteName()).resolves.toBe('dana');
    const call = vi.fn(async (name: string) => name);
    void withSiteName(call);
    expect(call).toHaveBeenCalledWith('dana');
    expect(mock.history.get).toHaveLength(0);
  });

  it('asks the API by host when the inlined config is for another host', async () => {
    stubLocation(`https://${OWN}/`);
    inline({ subDomain: 'someone-else', host: 'www.another-business.com', config: {} });
    mock.onGet(HOST_ROUTE).reply(200, { success: true, data: { subDomain: 'dana', businessName: 'Dana' } });

    expect(siteNameNow()).toBeNull();
    await expect(siteName()).resolves.toBe('dana');
    expect(mock.history.get.map((request) => request.url)).toEqual([HOST_ROUTE]);
    // Known from here on.
    expect(siteNameNow()).toBe('dana');
  });

  it('asks the API by host when there is no inlined config (or one without a host), once for everyone', async () => {
    stubLocation(`https://${OWN}/manage/abc`);
    inline({ subDomain: 'www', config: {} });
    mock.onGet(HOST_ROUTE).reply(200, { success: true, data: { subDomain: 'dana', businessName: 'Dana' } });

    expect(siteNameNow()).toBeNull();
    const call = vi.fn(async (name: string) => `posts of ${name}`);
    const [config, name, called] = await Promise.all([outsideHostConfig(), siteName(), withSiteName(call)]);
    expect(config).toEqual({ subDomain: 'dana', businessName: 'Dana' });
    expect(name).toBe('dana');
    expect(called).toBe('posts of dana');
    await siteName();
    expect(mock.history.get).toHaveLength(1);
  });

  it('fails as the config route fails, and may be asked again', async () => {
    stubLocation(`https://${OWN}/`);
    mock.onGet(HOST_ROUTE).replyOnce(404, { success: false });
    await expect(siteName()).rejects.toMatchObject({ response: { status: 404 } });
    expect(siteNameNow()).toBeNull();

    mock.onGet(HOST_ROUTE).replyOnce(403, { success: false });
    await expect(outsideHostConfig()).rejects.toMatchObject({ response: { status: 403 } });

    mock.onGet(HOST_ROUTE).replyOnce(200, { success: true, data: { businessName: 'No name' } });
    await expect(siteName()).rejects.toThrow();

    mock.onGet(HOST_ROUTE).replyOnce(200, { success: true, data: { subDomain: 'dana' } });
    await expect(siteName()).resolves.toBe('dana');
    expect(mock.history.get).toHaveLength(4);
  });
});

describe('the booking client on an outside host (LT-661)', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    resetSiteForTests();
  });
  afterEach(() => {
    mock.restore();
    document.getElementById(INLINE_CONFIG_ID)?.remove();
  });

  it("scopes the calendar to the site's name, not the host's first label", async () => {
    const { default: AppointmentService } = await import('../../services/AppointmentService');
    stubLocation(`https://${OWN}/`);
    mock.onGet(HOST_ROUTE).reply(200, { success: true, data: { subDomain: 'dana' } });
    mock.onGet(/\/appointments\/availability$/).reply(200, { data: [] });

    await AppointmentService.getInstance().getAvailability();

    const calendar = mock.history.get.find((request) => request.url?.endsWith('/availability'));
    expect(calendar?.params).toEqual({ subdomain: 'dana' });
  });
});

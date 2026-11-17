import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import globals from '../../services/globals';
import { loadPhoneCountries, phoneCountriesNow, resetPhoneCountriesForTests } from '../../services/phoneCountries';

/**
 * LT-677 - which countries a phone field offers. The API names the ones
 * abroad; anything but a clear answer leaves Israel alone, which is the site
 * exactly as it was.
 */
describe('the open phone countries', () => {
  let mock: MockAdapter;
  const url = `${globals.messagingUrl}/phone-countries`;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    resetPhoneCountriesForTests({ ask: true });
  });

  afterEach(() => {
    mock.restore();
    resetPhoneCountriesForTests();
  });

  it('is Israel alone before anything is asked', () => {
    expect(phoneCountriesNow()).toEqual(['IL']);
    expect(mock.history.get).toHaveLength(0);
  });

  it('adds the countries the API opened, after Israel', async () => {
    mock.onGet(url).reply(200, { success: true, data: { home: 'IL', abroad: ['US'] } });
    await expect(loadPhoneCountries()).resolves.toEqual(['IL', 'US']);
    expect(phoneCountriesNow()).toEqual(['IL', 'US']);
  });

  it('asks once for the page, however many fields ask', async () => {
    mock.onGet(url).reply(200, { success: true, data: { home: 'IL', abroad: ['US'] } });
    await Promise.all([loadPhoneCountries(), loadPhoneCountries()]);
    await loadPhoneCountries();
    expect(mock.history.get).toHaveLength(1);
  });

  it('stays Israel alone while no country is open', async () => {
    mock.onGet(url).reply(200, { success: true, data: { home: 'IL', abroad: [] } });
    await expect(loadPhoneCountries()).resolves.toEqual(['IL']);
  });

  it('stays Israel alone on an older API (404), and does not ask again', async () => {
    mock.onGet(url).reply(404);
    await expect(loadPhoneCountries()).resolves.toEqual(['IL']);
    await expect(loadPhoneCountries()).resolves.toEqual(['IL']);
    expect(mock.history.get).toHaveLength(1);
  });

  it.each([
    ['a server error', () => mock.onGet(url).reply(500)],
    ['no network', () => mock.onGet(url).networkError()],
    ['a timeout', () => mock.onGet(url).timeout()],
  ])('stays Israel alone on %s', async (_name, arrange) => {
    arrange();
    await expect(loadPhoneCountries()).resolves.toEqual(['IL']);
  });

  it.each([
    [null],
    ['US'],
    [{ data: null }],
    [{ data: { abroad: 'US' } }],
    [{ data: { abroad: [null, 7, {}] } }],
  ])('stays Israel alone on an answer of another shape: %j', async (body) => {
    mock.onGet(url).reply(200, body);
    await expect(loadPhoneCountries()).resolves.toEqual(['IL']);
  });

  it('leaves out a country this app cannot read a number in, and Israel named twice', async () => {
    mock.onGet(url).reply(200, { success: true, data: { home: 'IL', abroad: ['GB', 'US', 'IL', 'US'] } });
    await expect(loadPhoneCountries()).resolves.toEqual(['IL', 'US']);
  });

  it('never asks from a test that did not say so', async () => {
    resetPhoneCountriesForTests();
    await expect(loadPhoneCountries()).resolves.toEqual(['IL']);
    expect(mock.history.get).toHaveLength(0);
  });
});

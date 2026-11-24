import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import globals from '../../services/globals';
import { loadPhoneCountries, phoneCountriesNow, resetPhoneCountriesForTests, smsCountriesNow, textReaches } from '../../services/phoneCountries';

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

  describe('where a text reaches (LT-716)', () => {
    it('is not named before anything is asked: every country keeps its switch', () => {
      expect(smsCountriesNow()).toBeNull();
      expect(textReaches('US')).toBe(true);
      expect(textReaches('IL')).toBe(true);
    });

    it('reads the API`s `sms` list: Israel, and only the countries named', async () => {
      mock.onGet(url).reply(200, { success: true, data: { home: 'IL', abroad: ['US'], sms: ['IL'] } });
      await loadPhoneCountries();
      expect(phoneCountriesNow()).toEqual(['IL', 'US']);
      expect(smsCountriesNow()).toEqual(['IL']);
      expect(textReaches('IL')).toBe(true);
      expect(textReaches('US')).toBe(false);
    });

    it('a country abroad named there takes texts', async () => {
      mock.onGet(url).reply(200, { success: true, data: { home: 'IL', abroad: ['US'], sms: ['IL', 'US'] } });
      await loadPhoneCountries();
      expect(textReaches('US')).toBe(true);
    });

    it('keeps Israel and drops what is not a country code', async () => {
      mock.onGet(url).reply(200, { success: true, data: { home: 'IL', abroad: ['US'], sms: ['US', 'us', 7, null, 'US'] } });
      await loadPhoneCountries();
      expect(smsCountriesNow()).toEqual(['IL', 'US']);
    });

    it.each([
      ['an older API with no `sms` field', () => mock.onGet(url).reply(200, { success: true, data: { home: 'IL', abroad: ['US'] } })],
      ['an `sms` that is no list', () => mock.onGet(url).reply(200, { success: true, data: { home: 'IL', abroad: ['US'], sms: 'IL' } })],
      ['a failed request', () => mock.onGet(url).reply(500)],
    ])('names nothing on %s: the switch stays for every number, as before', async (_name, arrange) => {
      arrange();
      await loadPhoneCountries();
      expect(smsCountriesNow()).toBeNull();
      expect(textReaches('US')).toBe(true);
    });
  });

  it('never asks from a test that did not say so', async () => {
    resetPhoneCountriesForTests();
    await expect(loadPhoneCountries()).resolves.toEqual(['IL']);
    expect(mock.history.get).toHaveLength(0);
  });
});

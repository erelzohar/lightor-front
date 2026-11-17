import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import smsService from '../../services/SmsService';
import globals from '../../services/globals';

/**
 * LT-677 - a number abroad proves itself in the code frame; the proof is
 * exchanged at the API for the same phone token a verified Israeli code
 * earns. No token, whatever the reason, means "not proven".
 */
describe('SmsService.exchangePhoneProof', () => {
  let mock: MockAdapter;
  const url = `${globals.messagingUrl}/otp/firebase`;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  it('posts the proof and returns the phone token', async () => {
    mock.onPost(url).reply(200, { success: true, phone: '+12125550123', phoneToken: 'pt_abroad' });
    await expect(smsService.exchangePhoneProof('id-token-1')).resolves.toEqual({ ok: true, phoneToken: 'pt_abroad', phone: '+12125550123' });
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ idToken: 'id-token-1' });
  });

  it('is not proven when the server refuses the proof, and says why', async () => {
    mock.onPost(url).reply(400, { success: false, code: 'PHONE_PROOF_INVALID' });
    await expect(smsService.exchangePhoneProof('bad')).resolves.toEqual({ ok: false, status: 400, code: 'PHONE_PROOF_INVALID' });
  });

  it('is not proven when the API has no such route', async () => {
    mock.onPost(url).reply(404);
    await expect(smsService.exchangePhoneProof('x')).resolves.toEqual({ ok: false, status: 404 });
  });

  it.each([
    [{ success: true }],
    [{ success: true, phoneToken: '' }],
    [{ success: false, phoneToken: 'pt' }],
    [{}],
  ])('is not proven when a 200 carries no token: %j', async (body) => {
    mock.onPost(url).reply(200, body);
    await expect(smsService.exchangePhoneProof('x')).resolves.toEqual({ ok: false });
  });

  it('never throws on a network failure', async () => {
    mock.onPost(url).networkError();
    await expect(smsService.exchangePhoneProof('x')).resolves.toEqual({ ok: false });
  });
});

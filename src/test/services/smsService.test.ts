import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import smsService from '../../services/SmsService';
import globals from '../../services/globals';

/**
 * The visitor-facing messaging client.
 *
 * The contact form spent months posting to /sms, an endpoint locked to real
 * accounts since LT-003 — every submission died with a 401 that this class
 * swallowed, so the site showed a success tick and the business owner never
 * received anything. Nobody noticed because *no error ever surfaced*. The
 * endpoint and payload are therefore pinned here, and so is the one place
 * where swallowing failures is still correct: the return value must go false,
 * not throw, so the form can say something honest.
 */
describe('SmsService', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('sendContactMessage', () => {
    const form = { name: 'Dana', phone: '0501234567', message: 'Do you have Sunday slots?' };

    it('posts to the contact endpoint, not the SMS one (LT-035)', async () => {
      mock.onPost(`${globals.messagingUrl}/contact`).reply(200, { success: true });

      await expect(smsService.sendContactMessage('demo', form)).resolves.toBe(true);
      expect(mock.history.post).toHaveLength(1);
      expect(mock.history.post[0].url).toBe(`${globals.messagingUrl}/contact`);
    });

    it('names the business by subdomain and nothing else', async () => {
      // The server resolves the owner and their address from the subdomain.
      // A caller-supplied recipient would turn this into an open relay.
      mock.onPost(`${globals.messagingUrl}/contact`).reply(200, { success: true });

      await smsService.sendContactMessage('demo', form);

      expect(JSON.parse(mock.history.post[0].data)).toEqual({ subdomain: 'demo', ...form });
    });

    it('reports failure instead of a silent success', async () => {
      mock.onPost(`${globals.messagingUrl}/contact`).reply(401);

      await expect(smsService.sendContactMessage('demo', form)).resolves.toBe(false);
    });

    it('reports failure when the server answers 200 without success', async () => {
      mock.onPost(`${globals.messagingUrl}/contact`).reply(200, { success: false });

      await expect(smsService.sendContactMessage('demo', form)).resolves.toBeFalsy();
    });

    it('reports failure when the network is down', async () => {
      mock.onPost(`${globals.messagingUrl}/contact`).networkError();

      await expect(smsService.sendContactMessage('demo', form)).resolves.toBe(false);
    });
  });

  describe('OTP', () => {
    it('sends the code with the requested channel and language', async () => {
      mock.onPost(`${globals.messagingUrl}/otp/send`).reply(200, { success: true });

      await expect(smsService.sendOtp('0501234567', 'whatsapp', 'he')).resolves.toBe(true);
      expect(JSON.parse(mock.history.post[0].data)).toEqual({
        phoneNumber: '0501234567',
        channelType: 'whatsapp',
        languageCode: 'he',
      });
    });

    it('defaults to SMS', async () => {
      mock.onPost(`${globals.messagingUrl}/otp/send`).reply(200, { success: true });

      await smsService.sendOtp('0501234567');

      expect(JSON.parse(mock.history.post[0].data).channelType).toBe('sms');
    });

    it('returns the phone token that a booking requires (LT-005)', async () => {
      // createAppointment sends this back as proof the number was verified.
      // Losing it turns every anonymous booking into a 401.
      mock.onPost(`${globals.messagingUrl}/otp/verify`).reply(200, {
        success: true,
        phoneToken: 'pt_abc',
      });

      await expect(smsService.verifyOtp('0501234567', '123456')).resolves.toBe('pt_abc');
    });

    it('returns null for a wrong code', async () => {
      mock.onPost(`${globals.messagingUrl}/otp/verify`).reply(200, { success: false });

      await expect(smsService.verifyOtp('0501234567', '000000')).resolves.toBeNull();
    });

    it('returns null when verification succeeds without a token', async () => {
      // Null is the only value that means "not verified"; anything truthy here
      // would let the booking proceed with a token the API will reject.
      mock.onPost(`${globals.messagingUrl}/otp/verify`).reply(200, { success: true });

      await expect(smsService.verifyOtp('0501234567', '123456')).resolves.toBeNull();
    });

    it('returns null when the request fails outright', async () => {
      mock.onPost(`${globals.messagingUrl}/otp/verify`).reply(500);

      await expect(smsService.verifyOtp('0501234567', '123456')).resolves.toBeNull();
    });
  });
});

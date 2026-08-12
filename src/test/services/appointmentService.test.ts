import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import AppointmentService from '../../services/AppointmentService';
import globals from '../../services/globals';
import { stubLocation } from '../helpers/location';

/**
 * The booking client, and the two rules that keep tenants apart.
 *
 * `getAvailability` replaced a query that returned whole appointment
 * documents — customer names and phone numbers included — to any visitor
 * (LT-001). The business is identified server-side from the subdomain, so
 * there is no id in the request to tamper with; that is the property under
 * test, not merely the response shape.
 *
 * `manageToken` is the other half (LT-013): possession of an appointment id
 * stopped being authority to read or change it, and the token that replaced
 * it lives in the URL of the SMS link. Dropping it silently turns every
 * manage link into a 403.
 */
describe('AppointmentService', () => {
  let mock: MockAdapter;
  const service = AppointmentService.getInstance();
  const base = globals.appointmentsUrl;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    stubLocation('https://demo.lightor.app/');
  });

  afterEach(() => {
    mock.restore();
  });

  describe('getAvailability', () => {
    it('scopes the request to the subdomain it is served from', async () => {
      mock.onGet(`${base}/availability`).reply(200, { data: [] });

      await service.getAvailability();

      expect(mock.history.get[0].params).toEqual({ subdomain: 'demo' });
    });

    it('never sends a user id the caller could change', async () => {
      mock.onGet(`${base}/availability`).reply(200, { data: [] });

      await service.getAvailability();

      expect(mock.history.get[0].params).not.toHaveProperty('user_id');
      expect(mock.history.get[0].url).not.toContain('user_id');
    });

    it('passes a start date through when given one', async () => {
      mock.onGet(`${base}/availability`).reply(200, { data: [] });

      await service.getAvailability(1700000000000);

      expect(mock.history.get[0].params).toEqual({
        subdomain: 'demo',
        startDate: '1700000000000',
      });
    });

    it('omits the start date entirely when not given one', async () => {
      // `startDate: undefined` would serialise as an empty parameter, which
      // the API reads as a date rather than as absent.
      mock.onGet(`${base}/availability`).reply(200, { data: [] });

      await service.getAvailability();

      expect(Object.keys(mock.history.get[0].params)).toEqual(['subdomain']);
    });

    it('returns busy windows carrying no customer data', async () => {
      mock.onGet(`${base}/availability`).reply(200, {
        data: [{ timestamp: '1700000000000', durationMS: '1800000', name: 'Dana', phone: '050' }],
      });

      const slots = await service.getAvailability();

      expect(slots).toHaveLength(1);
      expect(slots[0]).toEqual({ timestamp: '1700000000000', durationMS: '1800000' });
      expect(slots[0]).not.toHaveProperty('name');
      expect(slots[0]).not.toHaveProperty('phone');
    });
  });

  describe('manage token', () => {
    const appointment = {
      _id: 'a1',
      user_id: 'u1',
      type: { _id: 't1', name: 'Cut', durationMS: '1800000', price: '100' },
      name: 'Dana',
      status: 'approved',
      phone: '0501234567',
      timestamp: '1700000000000',
    };

    it('forwards the token from the SMS link when reading a booking', async () => {
      stubLocation('https://demo.lightor.app/manage/a1?manageToken=mt_123');
      mock.onGet(`${base}/a1`).reply(200, { data: appointment });

      await service.getAppointmentById('a1');

      expect(mock.history.get[0].params).toEqual({ manageToken: 'mt_123' });
    });

    it('forwards the token when changing a booking', async () => {
      stubLocation('https://demo.lightor.app/manage/a1?manageToken=mt_123');
      mock.onPut(`${base}/a1`).reply(200, { data: appointment });

      await service.updateAppointment({ _id: 'a1', name: 'Dana Cohen' });

      expect(mock.history.put[0].params).toEqual({ manageToken: 'mt_123' });
    });

    it('sends no params at all when the URL carries no token', async () => {
      mock.onGet(`${base}/a1`).reply(200, { data: appointment });

      await service.getAppointmentById('a1');

      expect(mock.history.get[0].params).toBeUndefined();
    });
  });

  describe('createAppointment', () => {
    const draft = { name: 'Dana', phone: '0501234567', timestamp: '1700000000000' };
    const created = {
      _id: 'a2',
      user_id: 'u1',
      type: { _id: 't1', name: 'Cut', durationMS: '1800000', price: '100' },
      ...draft,
      status: 'pending',
    };

    it('sends the phone token as proof of verification (LT-005)', async () => {
      mock.onPost(base).reply(201, { data: created });

      await service.createAppointment(draft, 'pt_abc');

      expect(JSON.parse(mock.history.post[0].data)).toMatchObject({ phoneToken: 'pt_abc' });
    });

    it('omits the phone token when there is none', async () => {
      mock.onPost(base).reply(201, { data: created });

      await service.createAppointment(draft, null);

      expect(JSON.parse(mock.history.post[0].data)).not.toHaveProperty('phoneToken');
    });

    it('translates a taken slot into a code the form can act on', async () => {
      // Two people booking the same minute is the one failure the booking
      // form has a specific recovery for: reload the calendar and pick again.
      mock.onPost(base).reply(409);

      await expect(service.createAppointment(draft, 'pt_abc')).rejects.toThrow('SLOT_TAKEN');
    });

    it('propagates other failures instead of reporting a booking', async () => {
      mock.onPost(base).reply(500);

      await expect(service.createAppointment(draft, 'pt_abc')).rejects.toThrow();
    });

    it('defaults the reminder channel to SMS', async () => {
      mock.onPost(base).reply(201, { data: { ...created, channelType: undefined } });

      const result = await service.createAppointment(draft, 'pt_abc');

      expect(result.channelType).toBe('sms');
    });
  });
});

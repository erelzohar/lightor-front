import { describe, expect, it } from 'vitest';
import { AppointmentType } from '../../models/AppointmentType';
import { FEATURE_ICONS } from '../../components/Layout/About';
import { formatPrice } from '../../utils/currency';

/**
 * LT-670: an AI build sometimes writes a service's price as a number; the
 * price list and the booking widget called `.trim()` on it and the wizard's
 * preview showed "something went wrong" in their place. And a highlight about
 * the place or about getting in touch has its own icon.
 */
describe("a service's price", () => {
  it('is text whatever arrived', () => {
    const of = (price: unknown) => AppointmentType.fromJSON({ _id: 's', name: 'Cut', price, durationMS: '1800000' }).price;
    expect(of(80)).toBe('80');
    expect(of('80')).toBe('80');
    expect(of('from 50')).toBe('from 50');
    expect(of(0)).toBe('0');
    expect(of(undefined)).toBeUndefined();
    expect(of(null)).toBeUndefined();
  });

  it('formats a price that came as a number', () => {
    expect(formatPrice(AppointmentType.fromJSON({ _id: 's', name: 'Cut', price: 120 }).price, 'ILS')).toBe('₪120');
  });
});

describe("a highlight's icons", () => {
  it('include the place and the ways to get in touch', () => {
    for (const name of ['MapPin', 'Phone', 'Mail', 'Clock', 'Star']) expect(FEATURE_ICONS[name]).toBeTruthy();
  });
});

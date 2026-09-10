import { describe, it, expect } from 'vitest';
import { AppointmentType } from '../../models/AppointmentType';

/** Service pictures (LT-157) arrive on the service; blank means none. */
describe('AppointmentType.fromJSON', () => {
  it('carries the picture when the owner set one', () => {
    const t = AppointmentType.fromJSON({ _id: 'a', name: 'Cut', price: '80', user_id: 'u', durationMS: '1800000', image: ' x.webp ' });
    expect(t.image).toBe('x.webp');
  });

  it('leaves it undefined when absent or blank', () => {
    expect(AppointmentType.fromJSON({ _id: 'a', name: 'Cut', durationMS: '1' }).image).toBeUndefined();
    expect(AppointmentType.fromJSON({ _id: 'a', name: 'Cut', durationMS: '1', image: '  ' }).image).toBeUndefined();
  });
});

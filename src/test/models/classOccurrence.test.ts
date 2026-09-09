import { describe, it, expect } from 'vitest';
import { ClassOccurrence } from '../../models/ClassOccurrence';
import { AppointmentType } from '../../models/AppointmentType';

describe('ClassOccurrence', () => {
  const at = Date.now() + 86_400_000;
  const occurrence = () =>
    ClassOccurrence.fromJSON({
      type_id: 't1',
      timestamp: String(at),
      durationMS: '3600000',
      capacity: 12,
      booked: 8,
    });

  it('reads the window and what is left of it', () => {
    const o = occurrence();
    expect(o.startMs).toBe(at);
    expect(o.endMs).toBe(at + 3_600_000);
    expect(o.placesLeft).toBe(4);
    expect(o.isFull).toBe(false);
  });

  it('is full when every place is taken', () => {
    const o = ClassOccurrence.fromJSON({ type_id: 't1', timestamp: String(at), durationMS: '0', capacity: 12, booked: 12 });
    expect(o.isFull).toBe(true);
    expect(o.placesLeft).toBe(0);
  });

  it('never reports a negative number of places', () => {
    const o = ClassOccurrence.fromJSON({ type_id: 't1', timestamp: String(at), durationMS: '0', capacity: 2, booked: 5 });
    expect(o.placesLeft).toBe(0);
    expect(o.isFull).toBe(true);
  });
});

describe('AppointmentType and classes', () => {
  it('reads a class with a timetable', () => {
    const type = AppointmentType.fromJSON({
      _id: 't1',
      name: 'Group training',
      price: '60',
      user_id: 'u1',
      durationMS: '3600000',
      kind: 'class',
      capacity: 12,
      sessions: [{ weekday: 0, time: '19:00' }, { weekday: 5, time: '11:00' }],
    });

    expect(type.isClass).toBe(true);
    expect(type.capacity).toBe(12);
    expect(type.sessions).toHaveLength(2);
  });

  it('treats a service with no class fields exactly as before', () => {
    const type = AppointmentType.fromJSON({
      _id: 't2', name: 'Haircut', price: '80', user_id: 'u1', durationMS: '1800000',
    });

    expect(type.isClass).toBe(false);
    expect(type.kind).toBeUndefined();
    expect(type.capacity).toBeUndefined();
    expect(type.sessions).toEqual([]);
  });

  it('is not a bookable class until the owner sets times', () => {
    const type = AppointmentType.fromJSON({
      _id: 't3', name: 'Class', price: '', user_id: 'u1', durationMS: '3600000',
      kind: 'class', capacity: 10, sessions: [],
    });

    expect(type.isClass).toBe(false);
  });

  it('drops a malformed session rather than rendering nonsense', () => {
    const type = AppointmentType.fromJSON({
      _id: 't4', name: 'Class', price: '', user_id: 'u1', durationMS: '3600000',
      kind: 'class', capacity: 10, sessions: [{ weekday: 1 }, { weekday: 2, time: '08:00' }],
    });

    expect(type.sessions).toEqual([{ weekday: 2, time: '08:00' }]);
  });
});

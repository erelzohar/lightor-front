/**
 * One run of a group class (LT-152) — Sunday at 19:00, twelve places, eight
 * taken.
 *
 * The server expands these from the class's weekly timetable, so the
 * recurrence rules, the business timezone and the exceptions all live in one
 * place. Like BusySlot, it carries a headcount and never a roster: who is in
 * the class is the owner's business, not a visitor's.
 */
export class ClassOccurrence {
  constructor(
    public type_id: string,
    public timestamp: string,
    public durationMS: string,
    public capacity: number,
    public booked: number
  ) {}

  static fromJSON(json: any): ClassOccurrence {
    return new ClassOccurrence(
      json.type_id,
      json.timestamp,
      json.durationMS,
      Number(json.capacity) || 0,
      Number(json.booked) || 0
    );
  }

  get startMs(): number {
    return parseInt(this.timestamp, 10) || 0;
  }

  get endMs(): number {
    return this.startMs + (Number(this.durationMS) || 0);
  }

  get placesLeft(): number {
    return Math.max(0, this.capacity - this.booked);
  }

  get isFull(): boolean {
    return this.placesLeft <= 0;
  }
}

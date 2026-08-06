/**
 * An occupied window on a business's calendar.
 *
 * Deliberately just a start time and a duration: the booking widget only needs
 * to know that a slot is taken, never by whom. The API will not return more
 * than this — see GET /api/appointments/availability.
 */
export class BusySlot {
  constructor(
    public timestamp: string,
    public durationMS: string
  ) {}

  static fromJSON(json: any): BusySlot {
    return new BusySlot(json.timestamp, json.durationMS);
  }
}

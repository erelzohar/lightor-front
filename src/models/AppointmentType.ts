/** One weekly slot of a group class (LT-152): 0 = Sunday, 'HH:MM' local. */
export interface ClassSession {
  weekday: number;
  time: string;
}

export class AppointmentType {
  constructor(
    public _id: string,
    public name: string,
    // Optional: services seeded at signup are unpriced until the owner sets a price.
    public price: string | undefined,
    public user_id: string,
    public durationMS: string,
    /** Absent means an ordinary one-to-one appointment, which is most of them. */
    public kind?: 'appointment' | 'class',
    public capacity?: number,
    public sessions: ClassSession[] = []
  ) {}

  /** A class the owner has actually put times against. */
  get isClass(): boolean {
    return this.kind === 'class' && this.sessions.length > 0;
  }

  static fromJSON(json: any): AppointmentType {    
    return new AppointmentType(
      json._id,
      json.name,
      json.price,
      json.user_id,
      json.durationMS,
      json.kind,
      json.capacity !== undefined ? Number(json.capacity) : undefined,
      Array.isArray(json.sessions)
        ? json.sessions
            .filter((session: any) => session && typeof session.time === 'string')
            .map((session: any) => ({ weekday: Number(session.weekday) || 0, time: session.time }))
        : []
    );
  }
}
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
    /** '' for a leads site's service (LT-199): content, not a time slot. */
    public durationMS: string,
    /** Absent means an ordinary one-to-one appointment, which is most of them. */
    public kind?: 'appointment' | 'class',
    public capacity?: number,
    public sessions: ClassSession[] = [],
    // Picture set by the owner (LT-157): an uploaded image name or an https URL.
    public image?: string
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
      json.durationMS == null ? '' : String(json.durationMS),
      json.kind,
      json.capacity !== undefined ? Number(json.capacity) : undefined,
      Array.isArray(json.sessions)
        ? json.sessions
            .filter((session: any) => session && typeof session.time === 'string')
            .map((session: any) => ({ weekday: Number(session.weekday) || 0, time: session.time }))
        : [],
      typeof json.image === 'string' && json.image.trim() ? json.image.trim() : undefined
    );
  }
}

type ServiceLike = { name?: string | null; durationMS?: string | number | null } | null | undefined;

/**
 * A service a customer can book: a name and a time slot. Since LT-199 a
 * service may have no duration — a leads site lists what it does as content.
 */
export const isBookableService = (t: ServiceLike): boolean =>
  !!t?.name?.trim() && Number(t?.durationMS) > 0;

/**
 * Whether a customer has anything to book (LT-167). A site with nothing
 * bookable shows no schedule, no booking band and no "Book" links — they
 * would all lead to an empty widget. Use `takesBookings` (services/siteMode)
 * for the page: a leads site takes no bookings whatever its services.
 */
export const hasBookableServices = (types?: ReadonlyArray<ServiceLike> | null): boolean =>
  (types ?? []).some(isBookableService);

/** Services to list as content — named ones, bookable or not (LT-199). */
export const hasNamedServices = (types?: ReadonlyArray<ServiceLike> | null): boolean =>
  (types ?? []).some((t) => !!t?.name?.trim());

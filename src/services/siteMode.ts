import { hasBookableServices } from '../models/AppointmentType';

/**
 * What the site asks visitors to do (LT-199). `book`: the calendar, with the
 * contact form beside it — every site before LT-199. `lead`: a leads site —
 * no calendar; the contact form is the conversion and the main button points
 * at it. One resolver for every component, never re-derived inline.
 */
export type Conversion = 'book' | 'lead';

type Named = { name?: string | null; durationMS?: string | number | null } | null | undefined;

/** The calendar is on the page: a booking site with something bookable. */
export const takesBookings = (conversion: Conversion | undefined, types?: ReadonlyArray<Named> | null): boolean =>
  conversion !== 'lead' && hasBookableServices(types);

export interface MainCta {
  target: 'schedule' | 'contact';
  href: '#schedule' | '#contact';
  /** The owner's own words when they wrote some, else the mode's default. */
  label: string;
}

/**
 * The site's main button — the hero's, the navbar's, the booking band's.
 * `own` is `components.hero.cta`, the owner's text (rendered raw, never
 * translated). Null on a booking site with nothing to book yet: it keeps
 * the plain "Contact us" button it always had.
 */
export const mainCta = (
  input: { conversion?: Conversion; types?: ReadonlyArray<Named> | null; own?: string | null },
  t: (key: string) => string
): MainCta | null => {
  const own = input.own?.trim();
  if (takesBookings(input.conversion, input.types)) {
    return { target: 'schedule', href: '#schedule', label: own || t('hero.book') };
  }
  if (input.conversion === 'lead') {
    return { target: 'contact', href: '#contact', label: own || t('hero.contact') };
  }
  return null;
};

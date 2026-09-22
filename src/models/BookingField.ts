/**
 * A question the owner asks at booking time (LT-178).
 *
 * The catalog lives on the WebConfig next to bookingHorizonDays; the
 * customer's answers ride on the appointment with the label copied onto
 * them, so renaming or deleting a question later never rewrites what
 * somebody was asked. The form sends key and value: the server takes label
 * and type from the owner's own catalog and drops any key it does not know.
 * An address chosen from Google's suggestions (LT-191) also carries the
 * place id and coordinates it stands for.
 */
export type BookingFieldType = 'text' | 'address' | 'note' | 'choice' | 'confirm';

const FIELD_TYPES: ReadonlyArray<BookingFieldType> = ['text', 'address', 'note', 'choice', 'confirm'];

/** Server-enforced caps, mirrored here so the form refuses before the OTP is sent. */
export const ANSWER_MAX_LENGTH: Record<Exclude<BookingFieldType, 'confirm'>, number> = {
  text: 100,
  address: 200,
  note: 1000,
  choice: 30,
};

export class BookingField {
  constructor(
    /** Server-generated, stable forever; sent back unchanged. */
    public key: string,
    /** The owner's words, rendered raw — never through t(). */
    public label: string,
    public type: BookingFieldType,
    public required: boolean = false,
    /** choice only. */
    public options: string[] = [],
    /** AppointmentType ids; empty means every service. */
    public services: string[] = []
  ) {}

  static fromJSON(json: any): BookingField | null {
    if (!json || typeof json.key !== 'string' || !json.key || typeof json.label !== 'string') return null;
    if (!FIELD_TYPES.includes(json.type)) return null;
    return new BookingField(
      json.key,
      json.label,
      json.type,
      json.required === true,
      Array.isArray(json.options) ? json.options.filter((option: any) => typeof option === 'string') : [],
      Array.isArray(json.services) ? json.services.map(String) : []
    );
  }
}

/** The catalog as shipped on the config. Absent, or a malformed entry, is simply no question. */
export const parseBookingFields = (json: unknown): BookingField[] =>
  Array.isArray(json)
    ? json.map((entry) => BookingField.fromJSON(entry)).filter((field): field is BookingField => field !== null)
    : [];

/** The questions asked for one service, in catalog order. */
export const fieldsForService = (catalog: BookingField[], serviceId: string | null | undefined): BookingField[] =>
  catalog.filter((field) => field.services.length === 0 || field.services.includes(String(serviceId)));

/**
 * An address chosen from Google's suggestions (LT-191): the text the
 * customer saw plus the place it stands for. Typing again drops back to a
 * plain string, because the place is no longer vouched for.
 */
export interface AddressAnswer {
  text: string;
  placeId: string;
  lat: number;
  lng: number;
}

/** What the customer typed, ticked or chose for one question. Absent until they do. */
export type AnswerValue = string | boolean | AddressAnswer | undefined;

export const isAddressAnswer = (value: AnswerValue): value is AddressAnswer =>
  typeof value === 'object' && value !== null && typeof value.text === 'string' && typeof value.placeId === 'string';

/** The text of an answer whatever its shape; '' for a confirm or for nothing. */
export const answerText = (value: AnswerValue): string =>
  typeof value === 'string' ? value : isAddressAnswer(value) ? value.text : '';

/** How strictly an answer is judged, beyond the server's own checks. */
export interface AnswerRules {
  /**
   * The address question's suggestions are live (LT-191), so an address
   * that was typed but not chosen from them is refused. Off — no key, the
   * script blocked, Google down — typed text is as good as it ever was.
   */
  chooseAddress?: boolean;
}

export type AnswerProblem = 'required' | 'invalid' | 'chooseAddress';

/**
 * Why an answer would be refused, or null when it is fine. Mirrors the
 * server's checks so the refusal happens before an SMS is spent.
 */
export const answerProblem = (field: BookingField, value: AnswerValue, rules: AnswerRules = {}): AnswerProblem | null => {
  if (field.type === 'confirm') {
    if (value === true) return null;
    return field.required ? 'required' : null;
  }
  const text = answerText(value).trim();
  if (!text) return field.required ? 'required' : null;
  if (text.length > ANSWER_MAX_LENGTH[field.type]) return 'invalid';
  if (field.type === 'choice' && !field.options.includes(text)) return 'invalid';
  if (field.type === 'address' && rules.chooseAddress && !isAddressAnswer(value)) return 'chooseAddress';
  return null;
};

/**
 * One answer as the booking request carries it: key and value, plus — for
 * an address chosen from Google's suggestions (LT-191) — the place id and
 * coordinates the server keeps beside the text. Nothing else.
 */
export interface AnswerPayload {
  key: string;
  value: string;
  placeId?: string;
  lat?: number;
  lng?: number;
}

/**
 * The answers to send with a booking: the scoped fields only, skipping
 * empty optional ones and unticked confirms. A ticked confirm is 'yes',
 * which is also how the server stores it.
 */
export const answersForRequest = (fields: BookingField[], answers: Record<string, AnswerValue>): AnswerPayload[] =>
  fields.flatMap((field) => {
    const value = answers[field.key];
    if (field.type === 'confirm') return value === true ? [{ key: field.key, value: 'yes' }] : [];
    const text = answerText(value).trim();
    if (!text) return [];
    if (isAddressAnswer(value)) return [{ key: field.key, value: text, placeId: value.placeId, lat: value.lat, lng: value.lng }];
    return [{ key: field.key, value: text }];
  });

/** An answer as stored on the appointment: the label is a copy taken at booking time. */
export interface AppointmentAnswer {
  key: string;
  label: string;
  value: string;
  /** The place behind an address chosen from Google's suggestions (LT-191); absent for typed text. */
  placeId?: string;
  lat?: number;
  lng?: number;
}

/** Absent on rows booked before the feature existed. */
export const parseAnswers = (json: unknown): AppointmentAnswer[] =>
  Array.isArray(json)
    ? json
        .filter((answer: any) => answer && typeof answer.key === 'string' && typeof answer.value === 'string')
        .map((answer: any) => ({
          key: answer.key,
          label: typeof answer.label === 'string' ? answer.label : '',
          value: answer.value,
          ...(typeof answer.placeId === 'string' && typeof answer.lat === 'number' && typeof answer.lng === 'number'
            ? { placeId: answer.placeId, lat: answer.lat, lng: answer.lng }
            : {}),
        }))
    : [];

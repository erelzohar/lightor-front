/**
 * A question the owner asks at booking time (LT-178).
 *
 * The catalog lives on the WebConfig next to bookingHorizonDays; the
 * customer's answers ride on the appointment with the label copied onto
 * them, so renaming or deleting a question later never rewrites what
 * somebody was asked. The form sends key and value only: the server takes
 * label and type from the owner's own catalog and drops any key it does
 * not know.
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

/** What the customer typed or ticked for one question. Absent until they do. */
export type AnswerValue = string | boolean | undefined;

/**
 * Why an answer would be refused, or null when it is fine. Mirrors the
 * server's checks so the refusal happens before an SMS is spent.
 */
export const answerProblem = (field: BookingField, value: AnswerValue): 'required' | 'invalid' | null => {
  if (field.type === 'confirm') {
    if (value === true) return null;
    return field.required ? 'required' : null;
  }
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return field.required ? 'required' : null;
  if (text.length > ANSWER_MAX_LENGTH[field.type]) return 'invalid';
  if (field.type === 'choice' && !field.options.includes(text)) return 'invalid';
  return null;
};

/** One answer as the booking request carries it: key and value only. */
export interface AnswerPayload {
  key: string;
  value: string;
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
    const text = typeof value === 'string' ? value.trim() : '';
    return text ? [{ key: field.key, value: text }] : [];
  });

/** An answer as stored on the appointment: the label is a copy taken at booking time. */
export interface AppointmentAnswer {
  key: string;
  label: string;
  value: string;
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
        }))
    : [];

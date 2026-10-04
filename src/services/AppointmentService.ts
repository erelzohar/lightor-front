import axios from 'axios';
import globals from './globals';
import { Appointment } from '../models/Appointment';
import { BusySlot } from '../models/BusySlot';
import { ClassOccurrence } from '../models/ClassOccurrence';
import { AnswerPayload } from '../models/BookingField';
import { CANCEL_WINDOW_CLOSED, CancelWindowClosedError } from '../utils/cancelWindow';

/**
 * What the booking form posts (LT-178): the appointment's own fields plus
 * the answers as key and value only — the server takes label and type from
 * the owner's catalog.
 */
export type AppointmentDraft = Partial<Omit<Appointment, 'answers'>> & {
  type_id?: string;
  answers?: AnswerPayload[];
  /**
   * Fill the questions the owner keeps for next time from this customer's
   * record (LT-217) — the server does it once the phone is proven.
   */
  useRemembered?: boolean;
};

/** The booking can no longer change: past, or not scheduled (LT-217). */
export const BOOKING_CLOSED = 'BOOKING_CLOSED';

/**
 * The server refused an answer to one of the owner's questions (LT-178).
 * Carries the machine code and the field it named, so the form can go back
 * to the details step and put the message on that question.
 */
export class BookingRefusedError extends Error {
  constructor(
    public readonly code: 'ANSWER_REQUIRED' | 'ANSWER_INVALID',
    public readonly details?: { key?: string; label?: string }
  ) {
    super(code);
    this.name = 'BookingRefusedError';
  }
}

const ANSWER_CODES = ['ANSWER_REQUIRED', 'ANSWER_INVALID'] as const;

class AppointmentService {
  private static instance: AppointmentService;
  private readonly baseUrl: string;

  private constructor() {
    this.baseUrl = globals.appointmentsUrl;
  }

  public static getInstance(): AppointmentService {
    if (!AppointmentService.instance) {
      AppointmentService.instance = new AppointmentService();
    }
    return AppointmentService.instance;
  }

  /**
   * Busy slots for the business whose site we are currently on.
   *
   * The business is identified server-side from the subdomain, so there is no
   * user_id to pass — and no way for this call to reach another tenant's data.
   * Replaces the old getAppointments() query, which returned whole appointment
   * documents (customer names and phone numbers included) to every visitor.
   */
  public async getAvailability(startDate?: number): Promise<BusySlot[]> {
    return (await this.getCalendar(startDate)).busy;
  }

  /**
   * Busy windows AND the class timetable in one call (LT-152). The classes
   * array is additive: an older server simply omits it and the widget behaves
   * exactly as it did.
   */
  public async getCalendar(startDate?: number): Promise<{ busy: BusySlot[]; classes: ClassOccurrence[] }> {
    const subdomain = window.location.hostname.split('.')[0];

    const response = await axios.get<any>(`${this.baseUrl}/availability`, {
      params: {
        subdomain,
        ...(startDate !== undefined ? { startDate: String(startDate) } : {}),
      },
    });

    return {
      busy: (response.data?.data ?? []).map((slot: any) => BusySlot.fromJSON(slot)),
      classes: (response.data?.classes ?? []).map((occurrence: any) => ClassOccurrence.fromJSON(occurrence)),
    };
  }

  /**
   * The manage link we SMS carries `?manageToken=…` naming this appointment.
   * Forwarded here because possession of the id alone is no longer authority
   * to read or change a booking. (LT-013)
   */
  private static manageTokenFromUrl(): string | null {
    return new URLSearchParams(window.location.search).get('manageToken');
  }

  public async getAppointmentById(id: string): Promise<Appointment> {
    try {
      const manageToken = AppointmentService.manageTokenFromUrl();
      const response = await axios.get<any>(`${this.baseUrl}/${id}`, {
        params: manageToken ? { manageToken } : undefined,
      });

      return Appointment.fromJSON(response.data.data);
    } catch (error) {
      console.error(`Error fetching appointment with id ${id}:`, error);
      throw error;
    }
  }

  /**
   * `phoneToken` is the proof returned by /messaging/otp/verify. The API
   * requires it from anonymous bookers and checks it against the number being
   * booked, so a booking cannot skip phone verification. (LT-005)
   */
  public async createAppointment(
    appointment: AppointmentDraft,
    phoneToken?: string | null
  ): Promise<Appointment> {
    try {
      const response = await axios.post<any>(this.baseUrl, {
        ...appointment,
        ...(phoneToken ? { phoneToken } : {}),
      });
      // if (!response.data.success) return
      return Appointment.fromJSON(response.data.data);
    } catch (error: any) {
      if (error.response && error.response.status === 409) {
        // A class says which conflict it was (LT-152): this phone is already
        // in the session, or the last seat just went. Anything else is a
        // slot someone else took first.
        const code = error.response.data?.code;
        if (code === 'ALREADY_BOOKED' || code === 'CLASS_FULL') throw new Error(code);
        throw new Error("SLOT_TAKEN"); // Send a specific code to the component
      }
      // The business has blocked this phone number (LT-122). Keyed on the
      // server's machine-readable code, never on the message text.
      if (error.response?.status === 403 && error.response.data?.code === 'CUSTOMER_BLOCKED') {
        throw new Error("CUSTOMER_BLOCKED");
      }
      // An answer to one of the owner's questions was refused (LT-178): the
      // form returns to that question rather than showing a generic failure.
      if (error.response?.status === 400 && ANSWER_CODES.includes(error.response.data?.code)) {
        throw new BookingRefusedError(error.response.data.code, error.response.data.details);
      }
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  public async updateAppointment(app: Partial<Appointment>): Promise<Appointment> {
    try {
      const manageToken = AppointmentService.manageTokenFromUrl();
      const response = await axios.put<any>(`${this.baseUrl}/${app._id}`, app, {
        params: manageToken ? { manageToken } : undefined,
      });
      return Appointment.fromJSON(response.data?.data);
    } catch (error: any) {
      // A blocked customer may still cancel, but a reschedule is refused (LT-122).
      if (error?.response?.status === 403 && error.response.data?.code === 'CUSTOMER_BLOCKED') {
        throw new Error("CUSTOMER_BLOCKED");
      }
      // Inside the owner's cancellation window (LT-205): the manage page says
      // so and offers a call, instead of falling to its 404. Keyed on the
      // code; the window the server applied travels with the error.
      if (error?.response?.status === 400 && error.response.data?.code === CANCEL_WINDOW_CLOSED) {
        throw new CancelWindowClosedError(error.response.data.details?.minCancelTimeMS);
      }
      console.error(`Error updating appointment with id ${app._id}:`, error);
      throw error;
    }
  }

  /**
   * The customer corrects their answers from the manage link (LT-217): the
   * questions of the booked service, as key and value — the server rebuilds
   * them from the owner's catalog. Refusals come back as codes the page acts
   * on: an answer (BookingRefusedError), a closed booking, a blocked number.
   */
  public async updateAnswers(id: string, answers: AnswerPayload[]): Promise<Appointment> {
    try {
      const manageToken = AppointmentService.manageTokenFromUrl();
      const response = await axios.put<{ data?: unknown }>(`${this.baseUrl}/${id}/answers`, { answers }, {
        params: manageToken ? { manageToken } : undefined,
      });
      return Appointment.fromJSON(response.data?.data);
    } catch (error) {
      const refusal = axios.isAxiosError(error)
        ? (error.response?.data as { code?: string; details?: { key?: string; label?: string } } | undefined)
        : undefined;
      const code = refusal?.code;
      if (code === 'ANSWER_REQUIRED' || code === 'ANSWER_INVALID') throw new BookingRefusedError(code, refusal?.details);
      if (code === BOOKING_CLOSED || code === 'CUSTOMER_BLOCKED') throw new Error(code);
      console.error(`Error updating the answers of appointment ${id}:`, error);
      throw error;
    }
  }

  public async deleteAppointment(id: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/${id}`);
    } catch (error) {
      console.error(`Error deleting appointment with id ${id}:`, error);
      throw error;
    }
  }
}

export default AppointmentService;
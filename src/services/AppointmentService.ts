import axios from 'axios';
import globals from './globals';
import { Appointment } from '../models/Appointment';
import { BusySlot } from '../models/BusySlot';

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
    const subdomain = window.location.hostname.split('.')[0];

    const response = await axios.get<any>(`${this.baseUrl}/availability`, {
      params: {
        subdomain,
        ...(startDate !== undefined ? { startDate: String(startDate) } : {}),
      },
    });

    return response.data?.data.map((slot: any) => BusySlot.fromJSON(slot));
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
    appointment: Partial<Appointment>,
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
        throw new Error("SLOT_TAKEN"); // Send a specific code to the component
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
    } catch (error) {
      console.error(`Error updating appointment with id ${app._id}:`, error);
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
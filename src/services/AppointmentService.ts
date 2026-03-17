import axios from 'axios';
import globals from './globals';
import { Appointment } from '../models/Appointment';

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

  public async getAppointments(params: string): Promise<Appointment[]> {
    // try {
    if (!params) throw new Error("params required");
    const response = await axios.get<any>(this.baseUrl + params, { headers: { Authorization: process.env.NODE_ENV !== "production" ? "Bearer " + import.meta.env.VITE_CLIENT_TOKEN : '' } });
    return response.data?.data.map((appointment: any) => Appointment.fromJSON(appointment));
    // } catch (error) {
    //   console.error('Error fetching appointments:', error);
    //   throw error;
    // }
  }

  public async getAppointmentById(id: string): Promise<Appointment> {
    try {
      const response = await axios.get<any>(`${this.baseUrl}/${id}`, { headers: { Authorization: process.env.NODE_ENV !== "production" ? "Bearer " + import.meta.env.VITE_CLIENT_TOKEN : '' } });

      return Appointment.fromJSON(response.data.data);
    } catch (error) {
      console.error(`Error fetching appointment with id ${id}:`, error);
      throw error;
    }
  }

  public async createAppointment(appointment: Partial<Appointment>): Promise<Appointment> {
    try {
      const response = await axios.post<any>(this.baseUrl, appointment, { headers: { Authorization: process.env.NODE_ENV !== "production" ? "Bearer " + import.meta.env.VITE_CLIENT_TOKEN : '' } });
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
      const response = await axios.put<any>(`${this.baseUrl}/${app._id}`, app, { headers: { Authorization: process.env.NODE_ENV !== "production" ? "Bearer " + import.meta.env.VITE_CLIENT_TOKEN : '' } });
      return Appointment.fromJSON(response.data?.data);
    } catch (error) {
      console.error(`Error updating appointment with id ${app._id}:`, error);
      throw error;
    }
  }

  public async deleteAppointment(id: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/${id}`, { headers: { Authorization: process.env.NODE_ENV !== "production" ? "Bearer " + import.meta.env.VITE_CLIENT_TOKEN : '' } });
    } catch (error) {
      console.error(`Error deleting appointment with id ${id}:`, error);
      throw error;
    }
  }
}

export default AppointmentService;
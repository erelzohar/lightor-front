import { AppointmentType } from './AppointmentType';
import { AppointmentAnswer, parseAnswers } from './BookingField';

export class Appointment {
  constructor(
    public _id: string,
    public user_id: string,
    public type: AppointmentType,
    public name: string,
    public status: string,
    public phone: string,
    public timestamp: string,
    public channelType: 'sms' | 'whatsapp',
    /**
     * The customer's answers to the owner's questions (LT-178). Parsed so a
     * cancel or reschedule that sends the whole appointment back carries
     * them unchanged; the server ignores them on update either way.
     */
    public answers: AppointmentAnswer[] = []
  ) {}

  static fromJSON(json: any): Appointment {
    return new Appointment(
      json._id,
      json.user_id,
      AppointmentType.fromJSON(json.type),
      json.name,
      json.status,
      json.phone,
      json.timestamp,
      json.channelType || 'sms',
      parseAnswers(json.answers)
    );
  }
}
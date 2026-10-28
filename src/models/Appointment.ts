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
    public answers: AppointmentAnswer[] = [],
    /**
     * Changes the manage link still allows (LT-466); null when the server
     * did not say. At 0 the page says to call the business up front.
     */
    public changesLeft: number | null = null
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
      parseAnswers(json.answers),
      typeof json.changesLeft === 'number' ? json.changesLeft : null
    );
  }
}
import { AppointmentType } from './AppointmentType';

export class Appointment {
  constructor(
    public _id: string,
    public user_id: string,
    public type: AppointmentType,
    public name: string,
    public status: string,
    public phone: string,
    public timestamp: string
  ) {}

  static fromJSON(json: any): Appointment {    
    return new Appointment(
      json._id,
      json.user_id,
      AppointmentType.fromJSON(json.type),
      json.name,
      json.status,
      json.phone,
      json.timestamp
    );
  }
}
export class AppointmentType {
  constructor(
    public _id: string,
    public name: string,
    public price: string,
    public user_id: string,
    public durationMS: string
  ) {}

  static fromJSON(json: any): AppointmentType {    
    return new AppointmentType(
      json._id,
      json.name,
      json.price,
      json.user_id,
      json.durationMS
    );
  }
}
export class AppointmentType {
  constructor(
    public _id: string,
    public name: string,
    // Optional: services seeded at signup are unpriced until the owner sets a price.
    public price: string | undefined,
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
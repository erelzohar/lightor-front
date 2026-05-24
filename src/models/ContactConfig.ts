export class ContactConfig {
  constructor(
    public visible: boolean,
    public title: string,
    public description: string
  ) {}

  static fromJSON(json: any): ContactConfig {
    return new ContactConfig(
      json.visible,
      json.title,
      json.description
    );
  }
}
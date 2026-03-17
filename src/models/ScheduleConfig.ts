

export class ScheduleConfig {
  constructor(
    public title: string,
    public description: string,
    // public minsPerAppo: number
  ) { }

  static fromJSON(json: any): ScheduleConfig {    
    return new ScheduleConfig(
      json.title,
      json.description,
      // json.minsPerAppo
    );
  }
}
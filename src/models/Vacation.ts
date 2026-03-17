export class Vacation {
    constructor(
        public _id: string,
        public title: string,
        public startDate: string,
        public endDate: string,
        public webConfig_id: string

    ) { }

    static fromJSON(json: any): Vacation {
        return new Vacation(
            json._id,
            json.title,
            json.startDate,
            json.endDate,
            json.webConfig_id
        );
    }
}
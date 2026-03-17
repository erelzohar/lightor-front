abstract class Globals {
    public appointmentsUrl:string;
    public webConfigsUrl :string;
    public imagesUrl:string;
    public messagingUrl:string;
    // public typesUrl:string;
}

class DevelopmentGlobals extends Globals {
    public appointmentsUrl = "http://localhost:3000/api/appointments";
    public webConfigsUrl = "http://localhost:3000/api/web-configs";
    public messagingUrl = "http://localhost:3000/api/messaging";
    // public typesUrl = "http://localhost:3000/api/appointment-types/";
    public imagesUrl = "http://localhost:3000/api/images/";
}

// class ProductionGlobals extends Globals {
//     public appointmentsUrl = "https://ez-lines-server-84870f3974b9.herokuapp.com/api/appointments/";
//     public webConfigsUrl = "https://ez-lines-server-84870f3974b9.herokuapp.com/api/web-configs/";
//     public messagingUrl = "https://ez-lines-server-84870f3974b9.herokuapp.com/api/messaging/";
//     public imagesUrl = "https://ez-lines-server-84870f3974b9.herokuapp.com/api/images/";
//     public typesUrl = "https://ez-lines-server-84870f3974b9.herokuapp.com/api/appointment-types/";

// }
class ProductionGlobals extends Globals {
    public appointmentsUrl = "https://api.ez-lines.com/api/appointments";
    public webConfigsUrl = "https://api.ez-lines.com/api/web-configs";
    public messagingUrl = "https://api.ez-lines.com/api/messaging";
    public imagesUrl = "https://api.ez-lines.com/api/images/";
    // public typesUrl = "https://api.ez-lines.com/api/appointment-types/";

}

const globals = process.env.NODE_ENV === "production" ? new ProductionGlobals() : new DevelopmentGlobals();

export default globals;

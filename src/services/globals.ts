import { apiRoot } from "./site";

/**
 * The API's addresses. LT-661: all under one root, which is the API's own
 * address on a Lightor host (as always) and the page's own origin on a
 * business's own domain, where the edge forwards `/api/*` to the API: the
 * visitor-pass cookie stays a first-party one. See services/site.ts.
 */
class Globals {
    public appointmentsUrl: string;
    public webConfigsUrl: string;
    public imagesUrl: string;
    public messagingUrl: string;
    /** LT-302: Lighty on the site — questions and problem reports. */
    public siteAssistantUrl: string;
    /** LT-569: a visit to the site, a view of a product. */
    public visitsUrl: string;
    public authUrl: string;

    constructor(root: string) {
        this.appointmentsUrl = `${root}/appointments`;
        this.webConfigsUrl = `${root}/web-configs`;
        this.messagingUrl = `${root}/messaging`;
        this.siteAssistantUrl = `${root}/site-assistant`;
        this.visitsUrl = `${root}/visits`;
        this.imagesUrl = `${root}/images/`;
        this.authUrl = `${root}/auth/`;
    }
}

const globals = new Globals(apiRoot());

export default globals;

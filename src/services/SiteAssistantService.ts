import axios from 'axios';
import globals from './globals';

/**
 * LT-302 — Lighty on the site. Both calls need the page's visitor pass
 * (services/visitorPass.ts); a 401 means it is missing or expired.
 */
export interface AssistantTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface AssistantResult {
  ok: boolean;
  reply?: string;
  /** The refusal's status: 401 no pass, 429 resting or too many, 403/503 not on this site. */
  status?: number;
}

const failure = (err: unknown): AssistantResult => {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return { ok: false, ...(status ? { status } : {}) };
};

class SiteAssistantService {
  /** A visitor's question, with the conversation so far (the newest six turns). */
  public async ask(subdomain: string, message: string, history: AssistantTurn[], language: string): Promise<AssistantResult> {
    try {
      const res = await axios.post<{ success?: boolean; data?: { reply?: string } }>(
        `${globals.siteAssistantUrl}/${encodeURIComponent(subdomain)}/chat`,
        { message, history: history.slice(-6), language },
        { withCredentials: true }
      );
      const reply = res.data?.data?.reply;
      return res.data?.success && reply ? { ok: true, reply } : { ok: false };
    } catch (err) {
      return failure(err);
    }
  }

  /** A problem with the site, for the Lightor team — never the business owner. */
  public async report(subdomain: string, form: { message: string; contact?: string; pageUrl?: string; language?: string }): Promise<AssistantResult> {
    try {
      const res = await axios.post<{ success?: boolean }>(
        `${globals.siteAssistantUrl}/${encodeURIComponent(subdomain)}/report`,
        form,
        { withCredentials: true }
      );
      return { ok: !!res.data?.success };
    } catch (err) {
      return failure(err);
    }
  }
}

const siteAssistantService = new SiteAssistantService();
export default siteAssistantService;

import axios from "axios";
import globals from "./globals";
import i18n from "../i18n/config";
import type { AnswerPayload } from "../models/BookingField";

export interface ContactResult {
    ok: boolean;
    /** The HTTP status of a refusal; 401 means the visitor pass is missing or expired. */
    status?: number;
    code?: string;
    details?: { key?: string; label?: string };
}

/**
 * The outcome of asking for a verification code. `status` is the HTTP status
 * of a refusal: 401 means the visitor pass is missing or expired (LT-315 —
 * the server asks for the pass before it spends an SMS), which the booking
 * form answers by renewing the pass, where any other failure is final.
 */
export interface OtpSendResult {
    ok: boolean;
    status?: number;
}

class SMSService {
    /**
     * Contact-form submission — a lead (LT-035, LT-197). The server resolves
     * the business owner from the subdomain, stores the lead and tells the
     * owner; the caller never names a recipient. Answers carry key and value
     * only: the server takes labels and rules from the owner's `leadFields`.
     *
     * Resolves `{ ok: true }` or the server's refusal — `LEADS_CAP_REACHED`
     * when the month's leads are used up, `ANSWER_REQUIRED` /
     * `ANSWER_INVALID` with the question named in `details`.
     */
    public async sendContactMessage(
        subdomain: string,
        form: { name: string; phone: string; message?: string; answers?: AnswerPayload[] }
    ): Promise<ContactResult> {
        try {
            const res = await axios.post<any>(globals.messagingUrl + "/contact", { subdomain, ...form });
            return res.data?.success ? { ok: true } : { ok: false };
        }
        catch (err: any) {
            const data = err?.response?.data;
            const status: number | undefined = err?.response?.status;
            return {
                ok: false,
                ...(status ? { status } : {}),
                code: typeof data?.code === 'string' ? data.code : undefined,
                details: data?.details,
            };
        }
    }

    public async sendOtp(phoneNumber: string, channelType: string = 'sms', languageCode?: string): Promise<OtpSendResult> {
        try {
            const lang = languageCode ?? i18n.language ?? 'he';
            const res = await axios.post<any>(globals.messagingUrl + "/otp/send", { phoneNumber, channelType, languageCode: lang });
            return { ok: !!res.data?.success };
        } catch (err: any) {
            console.error(err);
            const status: number | undefined = err?.response?.status;
            return { ok: false, ...(status ? { status } : {}) };
        }
    }

    /**
     * Verifies the code and returns a short-lived proof that this number was
     * verified, which createAppointment requires. Null means "not verified" —
     * there is no booking without it.
     */
    public async verifyOtp(phoneNumber: string, otp: string): Promise<string | null> {
        try {
            const res = await axios.post<any>(globals.messagingUrl + "/otp/verify", { phoneNumber, otp });
            return res.data?.success ? (res.data.phoneToken ?? null) : null;
        } catch (err) {
            console.error(err);
            return null;
        }
    }
}
const smsService = new SMSService();
export default smsService;
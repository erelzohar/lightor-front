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

/**
 * The outcome of exchanging the code frame's proof for a phone token
 * (LT-677). A refusal carries the HTTP status and the server's code:
 * 400 `PHONE_PROOF_INVALID` when the proof or its number is not taken,
 * 404 when the API has no such route (numbers abroad are off).
 */
export interface PhoneProofResult {
    ok: boolean;
    phoneToken?: string;
    /** The number the proof was for, in E.164, as the server read it. */
    phone?: string;
    status?: number;
    code?: string;
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
        form: { name: string; phone: string; message?: string; answers?: AnswerPayload[]; productId?: string; productOptions?: { color?: string; size?: string } }
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

    /**
     * A number abroad proves itself in the code frame (LT-677), which hands
     * the page a proof; this exchanges it for the same short-lived phone
     * token a verified Israeli code earns. Never throws: no token means the
     * number is not proven.
     */
    public async exchangePhoneProof(idToken: string): Promise<PhoneProofResult> {
        try {
            const res = await axios.post<{ success?: boolean; phone?: unknown; phoneToken?: unknown }>(
                globals.messagingUrl + "/otp/firebase",
                { idToken }
            );
            const phoneToken = res.data?.success ? res.data.phoneToken : null;
            if (typeof phoneToken !== 'string' || !phoneToken) return { ok: false };
            return { ok: true, phoneToken, ...(typeof res.data.phone === 'string' ? { phone: res.data.phone } : {}) };
        } catch (err) {
            const response = (err as { response?: { status?: number; data?: { code?: unknown } } } | null)?.response;
            const code = response?.data?.code;
            return { ok: false, ...(response?.status ? { status: response.status } : {}), ...(typeof code === 'string' ? { code } : {}) };
        }
    }
}
const smsService = new SMSService();
export default smsService;
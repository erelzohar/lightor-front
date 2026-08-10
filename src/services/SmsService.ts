import axios from "axios";
import globals from "./globals";
import i18n from "../i18n/config";

class SMSService {
    /**
     * Contact-form submission. The server resolves the business owner from
     * the subdomain and emails them — the caller never names a recipient.
     * Replaces the old sendSMS, which had been dying with 401 since /sms was
     * locked to real accounts (LT-003); email also costs nothing per send.
     * (LT-035)
     */
    public async sendContactMessage(subdomain: string, form: { name: string; phone: string; message: string }): Promise<boolean> {
        try {
            const res = await axios.post<any>(globals.messagingUrl + "/contact", { subdomain, ...form });
            return res.data?.success;
        }
        catch (err) {
            return false;
        }
    }

    public async sendOtp(phoneNumber: string, channelType: string = 'sms', languageCode?: string): Promise<boolean> {
        try {
            const lang = languageCode ?? i18n.language ?? 'he';
            const res = await axios.post<any>(globals.messagingUrl + "/otp/send", { phoneNumber, channelType, languageCode: lang });
            return res.data?.success;
        } catch (err) {
            console.error(err);
            return false;
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
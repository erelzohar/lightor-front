import axios from "axios";
import globals from "./globals";
import i18n from "../i18n/config";

class SMSService {
    public async sendSMS(to: string, message: string): Promise<boolean> {
        try {
            const res = await axios.post<any>(globals.messagingUrl + "/sms", { to, message });
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